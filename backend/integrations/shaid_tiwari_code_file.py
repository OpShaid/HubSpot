import os
import requests
from fastapi import HTTPException, Form
from fastapi.responses import RedirectResponse
from urllib.parse import urlencode
import json
import uuid


HUBSPOT_CLIENT_ID = os.getenv("HUBSPOT_CLIENT_ID", "52b48740-8c25-4742-adcb-867f2b66e6b4")
HUBSPOT_CLIENT_SECRET = os.getenv("HUBSPOT_CLIENT_SECRET", "200e9181-994b-40cf-8c4b-345f5755ec5d")
HUBSPOT_REDIRECT_URI = os.getenv("HUBSPOT_REDIRECT_URI", "http://localhost:8000/integrations/hubspot/oauth2callback")


HUBSPOT_AUTH_URL = "https://app.hubspot.com/oauth/authorize"
HUBSPOT_TOKEN_URL = "https://api.hubapi.com/oauth/v1/token"
HUBSPOT_API_BASE = "https://api.hubapi.com"


class IntegrationItem:
    
    def __init__(self, id=None, name=None, type=None, parent_id=None, 
                 parent_name=None, data=None):
        self.id = id
        self.name = name
        self.type = type
        self.parent_id = parent_id
        self.parent_name = parent_name
        self.data = data or {}
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "parent_id": self.parent_id,
            "parent_name": self.parent_name,
            "data": self.data
        }


def authorize_hubspot(user_id: str, org_id: str, redis_client):

    
    state = f"hubspot_{user_id}_{org_id}_{uuid.uuid4().hex}"
    
 
    redis_client.setex(
        f"hubspot_state_{state}",
        600,  
        json.dumps({"user_id": user_id, "org_id": org_id})
    )
    
    
    scopes = [
        "crm.objects.contacts.read",
        "crm.objects.companies.read",
        "crm.objects.deals.read",
        "crm.schemas.contacts.read",
        "crm.schemas.companies.read",
        "crm.schemas.deals.read"
    ]
    
    
    params = {
        "client_id": HUBSPOT_CLIENT_ID,
        "redirect_uri": HUBSPOT_REDIRECT_URI,
        "scope": " ".join(scopes),
        "state": state
    }
    
   
    auth_url = f"{HUBSPOT_AUTH_URL}?{urlencode(params)}"
    
    return {
        "authorization_url": auth_url,
        "state": state
    }


def oauth2callback_hubspot(code: str, state: str, redis_client):
   
   
    try:
        
        state_data = redis_client.get(f"hubspot_state_{state}")
        if not state_data:
            raise HTTPException(status_code=400, detail="Invalid or expired state")
        
        state_info = json.loads(state_data)
        user_id = state_info["user_id"]
        org_id = state_info["org_id"]
        
      
        token_data = {
            "grant_type": "authorization_code",
            "client_id": HUBSPOT_CLIENT_ID,
            "client_secret": HUBSPOT_CLIENT_SECRET,
            "redirect_uri": HUBSPOT_REDIRECT_URI,
            "code": code
        }
        
    
        response = requests.post(
            HUBSPOT_TOKEN_URL,
            data=token_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Failed to exchange code for token: {response.text}"
            )
        
        token_response = response.json()
        
        
        credentials = {
            "access_token": token_response.get("access_token"),
            "refresh_token": token_response.get("refresh_token"),
            "expires_in": token_response.get("expires_in"),
            "token_type": token_response.get("token_type", "Bearer")
        }
        
      
        redis_client.setex(
            f"hubspot_credentials_{user_id}_{org_id}",
            86400,  # 24 hours
            json.dumps(credentials)
        )
        
       
        redis_client.delete(f"hubspot_state_{state}")
        
      
        return """
        <html>
            <body>
                <script>
                    window.close();
                </script>
                <p>Authorization successful! You can close this window.</p>
            </body>
        </html>
        """
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_hubspot_credentials(user_id: str, org_id: str, redis_client):
   
    try:
        
        credentials_json = redis_client.get(f"hubspot_credentials_{user_id}_{org_id}")
        
        if not credentials_json:
            raise HTTPException(
                status_code=404,
                detail="Credentials not found. Please authorize again."
            )
        
       
        credentials = json.loads(credentials_json)
        return credentials
        
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="Failed to parse credentials"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def delete_hubspot_credentials(user_id: str, org_id: str, redis_client):

    try:
        redis_client.delete(f"hubspot_credentials_{user_id}_{org_id}")
        return {"message": "Credentials deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def refresh_hubspot_token(refresh_token: str):
 
    try:
        token_data = {
            "grant_type": "refresh_token",
            "client_id": HUBSPOT_CLIENT_ID,
            "client_secret": HUBSPOT_CLIENT_SECRET,
            "refresh_token": refresh_token
        }
        
        response = requests.post(
            HUBSPOT_TOKEN_URL,
            data=token_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Failed to refresh token: {response.text}"
            )
        
        return response.json()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_items_hubspot(credentials: dict):

    try:
        access_token = credentials.get("access_token")
        if not access_token:
            raise HTTPException(status_code=401, detail="No access token provided")
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        items = []
        
      
        try:
            contacts_url = f"{HUBSPOT_API_BASE}/crm/v3/objects/contacts"
            contacts_params = {"limit": 100, "properties": "firstname,lastname,email,company"}
            contacts_response = requests.get(contacts_url, headers=headers, params=contacts_params)
            
            if contacts_response.status_code == 200:
                contacts_data = contacts_response.json()
                for contact in contacts_data.get("results", []):
                    props = contact.get("properties", {})
                    item = IntegrationItem(
                        id=contact.get("id"),
                        name=f"{props.get('firstname', '')} {props.get('lastname', '')}".strip() or "Unnamed Contact",
                        type="contact",
                        parent_id=None,
                        parent_name="Contacts",
                        data={
                            "email": props.get("email"),
                            "company": props.get("company"),
                            "created_at": contact.get("createdAt"),
                            "updated_at": contact.get("updatedAt")
                        }
                    )
                    items.append(item)
        except Exception as e:
            print(f"Error fetching contacts: {str(e)}")
        
        # Fetch Companies
        try:
            companies_url = f"{HUBSPOT_API_BASE}/crm/v3/objects/companies"
            companies_params = {"limit": 100, "properties": "name,domain,industry,city"}
            companies_response = requests.get(companies_url, headers=headers, params=companies_params)
            
            if companies_response.status_code == 200:
                companies_data = companies_response.json()
                for company in companies_data.get("results", []):
                    props = company.get("properties", {})
                    item = IntegrationItem(
                        id=company.get("id"),
                        name=props.get("name", "Unnamed Company"),
                        type="company",
                        parent_id=None,
                        parent_name="Companies",
                        data={
                            "domain": props.get("domain"),
                            "industry": props.get("industry"),
                            "city": props.get("city"),
                            "created_at": company.get("createdAt"),
                            "updated_at": company.get("updatedAt")
                        }
                    )
                    items.append(item)
        except Exception as e:
            print(f"Error fetching companies: {str(e)}")
        
       
        try:
            deals_url = f"{HUBSPOT_API_BASE}/crm/v3/objects/deals"
            deals_params = {"limit": 100, "properties": "dealname,amount,dealstage,closedate"}
            deals_response = requests.get(deals_url, headers=headers, params=deals_params)
            
            if deals_response.status_code == 200:
                deals_data = deals_response.json()
                for deal in deals_data.get("results", []):
                    props = deal.get("properties", {})
                    item = IntegrationItem(
                        id=deal.get("id"),
                        name=props.get("dealname", "Unnamed Deal"),
                        type="deal",
                        parent_id=None,
                        parent_name="Deals",
                        data={
                            "amount": props.get("amount"),
                            "stage": props.get("dealstage"),
                            "close_date": props.get("closedate"),
                            "created_at": deal.get("createdAt"),
                            "updated_at": deal.get("updatedAt")
                        }
                    )
                    items.append(item)
        except Exception as e:
            print(f"Error fetching deals: {str(e)}")
        
        return items
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching HubSpot items: {str(e)}")
