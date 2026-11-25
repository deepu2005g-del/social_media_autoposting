from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from urllib.parse import quote, urlencode
from typing import Optional, List
from datetime import datetime, timedelta
from jose import JWTError, jwt
import secrets
import requests
import os

from db import get_db
from models import LinkedInUser, User, ScheduledPost
from config import CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, FRONTEND_URL as CONFIG_FRONTEND_URL
from routes.auth import get_current_user, SECRET_KEY, ALGORITHM
import logging

logger = logging.getLogger("linkedin_oauth")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)

router = APIRouter(prefix="/linkedin", tags=["LinkedIn"])

FRONTEND_URL = (os.getenv("FRONTEND_URL") or CONFIG_FRONTEND_URL or "http://localhost:5173").rstrip("/")
OAUTH_STATE_EXPIRE_MINUTES = 10

# In-memory nonce store for one-time OAuth state tracking (signed JWT also validates across restarts)
_oauth_states = {}


def _get_dashboard_url() -> str:
    base = (os.getenv("FRONTEND_URL") or FRONTEND_URL).rstrip("/")
    if base.endswith("/dashboard"):
        return base
    return f"{base}/dashboard"


def _create_oauth_state(user_id: int) -> str:
    nonce = secrets.token_urlsafe(24)
    expire = datetime.utcnow() + timedelta(minutes=OAUTH_STATE_EXPIRE_MINUTES)
    _oauth_states[nonce] = {"user_id": user_id, "exp": expire}
    logger.info("[LinkedIn OAuth] Stage 2: State generated for user_id=%s (nonce_prefix=%s)", user_id, nonce[:6])
    return jwt.encode(
        {"sub": str(user_id), "nonce": nonce, "purpose": "linkedin_oauth", "exp": expire},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def _validate_oauth_state(state: Optional[str]) -> Optional[int]:
    if not state:
        logger.warning("[LinkedIn OAuth] Stage 4: State validation failed (missing state)")
        return None
    try:
        payload = jwt.decode(state, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("purpose") != "linkedin_oauth":
            logger.warning("[LinkedIn OAuth] Stage 4: State validation failed (wrong purpose)")
            return None
        user_id = int(payload.get("sub"))
        nonce = payload.get("nonce")
        if nonce and nonce in _oauth_states:
            stored = _oauth_states.pop(nonce, None)
            if stored and stored.get("user_id") != user_id:
                logger.warning("[LinkedIn OAuth] Stage 4: State validation failed (nonce user mismatch)")
                return None
        logger.info("[LinkedIn OAuth] Stage 4: State validation succeeded for user_id=%s", user_id)
        return user_id
    except (JWTError, TypeError, ValueError) as exc:
        logger.warning("[LinkedIn OAuth] Stage 4: State validation failed (%s)", type(exc).__name__)
        return None


# 🔹 Step 1: Login — redirects user to LinkedIn OAuth
@router.get("/login")
def login(current_user: User = Depends(get_current_user)):
    logger.info("[LinkedIn OAuth] Stage 1: Authorization request initiated for user_id=%s", current_user.id)
    if not CLIENT_ID or not CLIENT_SECRET or not REDIRECT_URI:
        raise HTTPException(
            status_code=500,
            detail="LinkedIn OAuth is not configured. Missing LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, or REDIRECT_URI.",
        )

    state = _create_oauth_state(current_user.id)
    query = urlencode({
        "response_type": "code",
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "scope": "openid profile w_member_social",
        "state": state,
    })
    url = f"https://www.linkedin.com/oauth/v2/authorization?{query}"
    logger.info("[LinkedIn OAuth] Redirecting user_id=%s to LinkedIn OAuth with redirect_uri=%s", current_user.id, REDIRECT_URI)
    return {"auth_url": url}


# 🔹 Step 2: Callback — LinkedIn redirects here after user approves
@router.get("/callback")
def callback(
    code: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
    state: Optional[str] = None,
    db: Session = Depends(get_db)
):
    dashboard_url = _get_dashboard_url()
    logger.info(
        "[LinkedIn OAuth] Stage 3: Callback received (has_code=%s, has_state=%s, error=%s)",
        bool(code),
        bool(state),
        error or "none",
    )
    try:
        if error or not code:
            err_msg = error_description or error or "authorization_cancelled"
            logger.info("[LinkedIn OAuth] Stage 9: Redirecting to dashboard with error=%s", err_msg)
            return RedirectResponse(f"{dashboard_url}?linkedin=error&message={quote(str(err_msg))}")

        logger.info("[LinkedIn OAuth] Stage 5: Authorization code received (length=%d)", len(code))

        user_id = _validate_oauth_state(state)
        if not user_id:
            logger.warning("[LinkedIn OAuth] Stage 9: Redirecting to dashboard due to invalid state")
            return RedirectResponse(f"{dashboard_url}?linkedin=error&message={quote('Invalid or expired OAuth state. Please try again.')}")

        linked_user = db.query(User).filter(User.id == user_id).first()
        if not linked_user:
            logger.warning("[LinkedIn OAuth] Stage 8: User association failed (user_id=%s not found)", user_id)
            return RedirectResponse(f"{dashboard_url}?linkedin=error&message={quote('User account not found.')}")

        # Exchange code for access token
        token_url = "https://www.linkedin.com/oauth/v2/accessToken"
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT_URI,
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
        }

        res = requests.post(
            token_url,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=15,
        )
        logger.info("[LinkedIn OAuth] Stage 6: Token exchange HTTP status=%s", res.status_code)
        try:
            token_data = res.json()
        except Exception:
            token_data = {}

        if res.status_code != 200 or "access_token" not in token_data:
            li_err = token_data.get("error_description") or token_data.get("error") or "token_exchange_failed"
            logger.warning("[LinkedIn OAuth] Stage 7: Token exchange failed (%s)", li_err)
            return RedirectResponse(f"{dashboard_url}?linkedin=error&message={quote(str(li_err))}")

        logger.info("[LinkedIn OAuth] Stage 7: Token exchange succeeded")

        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in")

        # Get user info from LinkedIn
        headers = {"Authorization": f"Bearer {access_token}"}
        user_info_res = requests.get("https://api.linkedin.com/v2/userinfo", headers=headers, timeout=15)
        user_info = user_info_res.json() if user_info_res.status_code == 200 else {}
        linkedin_id = user_info.get("sub")

        if not linkedin_id:
            logger.warning("[LinkedIn OAuth] Stage 8: Failed to retrieve LinkedIn user sub (status=%s)", user_info_res.status_code)
            return RedirectResponse(f"{dashboard_url}?linkedin=error&message=no_user_id")

        expires_at = None
        if expires_in:
            expires_at = (datetime.utcnow() + timedelta(seconds=int(expires_in))).isoformat()

        # Store or update LinkedIn connection strictly for this authenticated user
        existing_for_user = db.query(LinkedInUser).filter(LinkedInUser.user_id == linked_user.id).first()
        if existing_for_user:
            existing_for_user.linkedin_id = linkedin_id
            existing_for_user.access_token = access_token
            if refresh_token:
                existing_for_user.refresh_token = refresh_token
            if expires_at:
                existing_for_user.expires_at = expires_at
        else:
            new_li_user = LinkedInUser(
                user_id=linked_user.id,
                linkedin_id=linkedin_id,
                access_token=access_token,
                refresh_token=refresh_token,
                expires_at=expires_at,
            )
            db.add(new_li_user)
        db.commit()
        logger.info("[LinkedIn OAuth] Stage 8: Associated linkedin_id=%s with user_id=%s", linkedin_id, linked_user.id)

        # Redirect back to existing dashboard with success
        logger.info("[LinkedIn OAuth] Stage 9: Redirecting to %s?linkedin=success", dashboard_url)
        return RedirectResponse(f"{dashboard_url}?linkedin=success")

    except Exception as e:
        db.rollback()
        logger.error("[LinkedIn OAuth] Stage 9: Callback exception (%s)", str(e))
        return RedirectResponse(f"{dashboard_url}?linkedin=error&message={quote(str(e))}")


# 🔹 Check if a LinkedIn account is connected
@router.get("/status")
def status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Return connection status for the authenticated user only
    linked = db.query(LinkedInUser).filter(LinkedInUser.user_id == current_user.id).first()
    if linked and linked.access_token:
        return {"connected": True, "linkedin_id": linked.linkedin_id}
    return {"connected": False}


# 🔹 Disconnect LinkedIn account
@router.delete("/disconnect")
def disconnect(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    linked = db.query(LinkedInUser).filter(LinkedInUser.user_id == current_user.id).first()
    if not linked:
        raise HTTPException(status_code=404, detail="No LinkedIn account connected for this user.")
    db.delete(linked)
    db.commit()
    return {"message": "LinkedIn account disconnected successfully."}


# 🔹 Helper: Register an image upload with LinkedIn
def register_image_upload(access_token: str, linkedin_id: str):
    """Step 1 of LinkedIn image posting: register the upload to get an upload URL and asset."""
    url = "https://api.linkedin.com/v2/assets?action=registerUpload"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    body = {
        "registerUploadRequest": {
            "recipes": ["urn:li:digitalmediaRecipe:feedshare-image"],
            "owner": f"urn:li:person:{linkedin_id}",
            "serviceRelationships": [
                {
                    "relationshipType": "OWNER",
                    "identifier": "urn:li:userGeneratedContent",
                }
            ],
        }
    }

    res = requests.post(url, headers=headers, json=body)
    print(f"[DEBUG] Register upload response: {res.status_code} - {res.text}")

    if res.status_code != 200:
        raise HTTPException(
            status_code=res.status_code,
            detail=f"Failed to register image upload: {res.text}",
        )

    data = res.json()
    upload_url = data["value"]["uploadMechanism"][
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ]["uploadUrl"]
    asset = data["value"]["asset"]

    return upload_url, asset


def post_text_and_images(access_token: str, linkedin_id: str, text: str, image_bytes_list: list):
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-Restli-Protocol-Version": "2.0.0",
        "Content-Type": "application/json",
    }

    media_entries = []
    for image_bytes in image_bytes_list:
        upload_url, asset = register_image_upload(access_token, linkedin_id)
        upload_image_binary(upload_url, image_bytes, access_token)
        media_entries.append({"status": "READY", "media": asset})

    if media_entries:
        share_content = {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": text},
                "shareMediaCategory": "IMAGE",
                "media": media_entries,
            }
        }
    else:
        share_content = {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": text},
                "shareMediaCategory": "NONE",
            }
        }

    data = {
        "author": f"urn:li:person:{linkedin_id}",
        "lifecycleState": "PUBLISHED",
        "specificContent": share_content,
        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
    }

    url = "https://api.linkedin.com/v2/ugcPosts"
    response = requests.post(url, headers=headers, json=data)
    if response.status_code != 201:
        raise HTTPException(status_code=response.status_code, detail=f"LinkedIn API error: {response.text}")
    return response.json()


def refresh_access_token(linked: LinkedInUser, db: Session):
    """Refresh LinkedIn access token using stored refresh_token."""
    if not linked.refresh_token:
        return False
    token_url = "https://www.linkedin.com/oauth/v2/accessToken"
    data = {
        "grant_type": "refresh_token",
        "refresh_token": linked.refresh_token,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
    }
    res = requests.post(token_url, data=data)
    try:
        token_data = res.json()
    except Exception:
        return False
    if "access_token" not in token_data:
        return False
    linked.access_token = token_data.get("access_token")
    if token_data.get("refresh_token"):
        linked.refresh_token = token_data.get("refresh_token")
    if token_data.get("expires_in"):
        from datetime import datetime, timedelta
        linked.expires_at = (datetime.utcnow() + timedelta(seconds=int(token_data.get("expires_in")))).isoformat()
    db.add(linked)
    db.commit()
    return True


# 🔹 Helper: Upload the actual image binary to LinkedIn
def upload_image_binary(upload_url: str, image_bytes: bytes, access_token: str):
    """Step 2 of LinkedIn image posting: upload the raw image bytes."""
    headers = {
        "Authorization": f"Bearer {access_token}",
    }

    res = requests.put(upload_url, headers=headers, data=image_bytes)
    print(f"[DEBUG] Image upload response: {res.status_code}")

    if res.status_code not in (200, 201):
        raise HTTPException(
            status_code=res.status_code,
            detail=f"Failed to upload image to LinkedIn: {res.text}",
        )


# 🔹 Step 3: Post Content (text only OR text + image)
@router.post("/post")
async def post(
    text: str = Form(...),
    images: Optional[List[UploadFile]] = File(None),
    scheduled_time: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    linked = db.query(LinkedInUser).filter(LinkedInUser.user_id == current_user.id).first()
    if not linked:
        raise HTTPException(
            status_code=404,
            detail="No LinkedIn account connected. Please connect first.",
        )

    access_token = linked.access_token
    linkedin_id = linked.linkedin_id

    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-Restli-Protocol-Version": "2.0.0",
        "Content-Type": "application/json",
    }

    # If scheduled_time provided and in future, save scheduled post
    if scheduled_time:
        # store image paths (saved to disk or S3)
        import json
        from utils.storage import save_media
        saved_paths = []
        if images:
            for img in images:
                if img and img.filename:
                    img_bytes = await img.read()
                    path_or_url = save_media(img_bytes, img.filename)
                    # if saved to disk, store relative path under media folder
                    if path_or_url.startswith("http"):
                        saved_paths.append(path_or_url)
                    else:
                        # convert to media route path
                        saved_paths.append(path_or_url)
        sp = ScheduledPost(user_id=current_user.id, platform="linkedin", text=text, images=json.dumps(saved_paths), scheduled_time=scheduled_time, processed=0)
        db.add(sp)
        db.commit()
        return {"message": "Scheduled on LinkedIn", "scheduled_time": scheduled_time}

    # Build the share content based on whether images are provided
    image_bytes_list = []
    if images:
        for img in images:
            if img and img.filename:
                image_bytes_list.append(await img.read())

    # Immediate post
    # Try refresh if token expired, then post. Retry once on 401-like failure.
    from fastapi import HTTPException as FastAPIHTTPException
    # refresh if expiry known
    try:
        from datetime import datetime
        if getattr(linked, "expires_at", None):
            try:
                exp = datetime.fromisoformat(linked.expires_at)
                if exp <= datetime.utcnow():
                    refreshed = refresh_access_token(linked, db)
                    if refreshed:
                        access_token = linked.access_token
            except Exception:
                pass
    except Exception:
        pass

    try:
        resp = post_text_and_images(access_token, linkedin_id, text, image_bytes_list)
        return {"message": "Posted successfully!", "response": resp}
    except FastAPIHTTPException as he:
        detail = str(he.detail)
        # On 401/expired token attempt one refresh + retry
        if he.status_code == 401 or "EXPIRED_ACCESS_TOKEN" in detail or "expired" in detail.lower():
            try:
                refreshed = refresh_access_token(linked, db)
                if refreshed:
                    resp = post_text_and_images(linked.access_token, linkedin_id, text, image_bytes_list)
                    return {"message": "Posted successfully after refresh!", "response": resp}
            except Exception as e:
                raise FastAPIHTTPException(status_code=502, detail=f"LinkedIn retry failed: {e}")
        # otherwise re-raise original
        raise