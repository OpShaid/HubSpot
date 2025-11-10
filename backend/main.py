from fastapi import FastAPI, Form, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse
from redis import Redis
from collections import Counter

from integrations.airtable import (
    authorize_airtable,
    get_items_airtable,
    oauth2callback_airtable,
    get_airtable_credentials
)
from integrations.notion import (
    authorize_notion,
    get_items_notion,
    oauth2callback_notion,
    get_notion_credentials
)
from integrations.hubspot import (
    authorize_hubspot,
    get_hubspot_credentials,
    get_items_hubspot,
    oauth2callback_hubspot,
    delete_hubspot_credentials
)


app = FastAPI()

origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

redis_client = Redis(host="localhost", port=6379, db=0, decode_responses=True)


@app.get('/')
def read_root():
    return {'Ping': 'Pong'}

@app.post('/integrations/airtable/authorize')
async def authorize_airtable_integration(user_id: str = Form(...), org_id: str = Form(...)):
    return await authorize_airtable(user_id, org_id)

@app.get('/integrations/airtable/oauth2callback')
async def oauth2callback_airtable_integration(request: Request):
    return await oauth2callback_airtable(request)

@app.post('/integrations/airtable/credentials')
async def get_airtable_credentials_integration(user_id: str = Form(...), org_id: str = Form(...)):
    return await get_airtable_credentials(user_id, org_id)

@app.post('/integrations/airtable/load')
async def get_airtable_items_integration(credentials: str = Form(...)):
    return await get_items_airtable(credentials)


@app.post('/integrations/notion/authorize')
async def authorize_notion_integration(user_id: str = Form(...), org_id: str = Form(...)):
    return await authorize_notion(user_id, org_id)

@app.get('/integrations/notion/oauth2callback')
async def oauth2callback_notion_integration(request: Request):
    return await oauth2callback_notion(request)

@app.post('/integrations/notion/credentials')
async def get_notion_credentials_integration(user_id: str = Form(...), org_id: str = Form(...)):
    return await get_notion_credentials(user_id, org_id)

@app.post('/integrations/notion/load')
async def get_notion_items_integration(credentials: str = Form(...)):
    return await get_items_notion(credentials)


@app.post("/integrations/hubspot/authorize")
def hubspot_authorize_integration(user_id: str = Form(...), org_id: str = Form(...)):
    """Initiates HubSpot OAuth flow"""
    return authorize_hubspot(user_id, org_id, redis_client)


@app.get("/integrations/hubspot/oauth2callback", response_class=HTMLResponse)
def hubspot_callback(code: str, state: str):
    """Handles OAuth callback from HubSpot"""
    return oauth2callback_hubspot(code, state, redis_client)


@app.get("/integrations/hubspot/credentials")
def hubspot_get_credentials(user_id: str, org_id: str):
    """Retrieves stored HubSpot credentials"""
    return get_hubspot_credentials(user_id, org_id, redis_client)


@app.delete("/integrations/hubspot/credentials")
def hubspot_disconnect(user_id: str, org_id: str):
    """Deletes stored HubSpot credentials"""
    return delete_hubspot_credentials(user_id, org_id, redis_client)


@app.post("/integrations/hubspot/items")
def hubspot_items(request: dict):
    """Fetches items from HubSpot CRM"""
    credentials = request.get("credentials")
    if not credentials:
        raise HTTPException(status_code=400, detail="Credentials required")
    
    items = get_items_hubspot(credentials)

    
    items_dict = [item.to_dict() for item in items]

    
    print("\n" + "="*50)
    print("HUBSPOT INTEGRATION ITEMS")
    print("="*50)
    print(f"Total items retrieved: {len(items_dict)}")
    print("\nItems by type:")
    type_counts = Counter(item['type'] for item in items_dict)
    for item_type, count in type_counts.items():
        print(f"  {item_type}: {count}")
    print("\nSample items:")
    for item in items_dict[:5]:
        print(f"  - [{item['type']}] {item['name']} (ID: {item['id']})")
    print("="*50 + "\n")

    return items_dict
