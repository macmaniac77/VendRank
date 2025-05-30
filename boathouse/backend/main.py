from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware # Added
from pydantic import BaseModel
import json, pathlib, uuid

DB = pathlib.Path(__file__).with_name("storage.json")
if not DB.exists(): DB.write_text(json.dumps({"items":[], "apps":[]}, indent=2))

def read_db():
    return json.loads(DB.read_text())

def write_db(data):
    DB.write_text(json.dumps(data, indent=2))

app = FastAPI(title="Boathouse Vending API")

# ---------- CORS MIDDLEWARE ----------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows all origins
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods
    allow_headers=["*"], # Allows all headers
)

# ---------- MODELS ----------
class Item(BaseModel):
    id: int
    name: str
    price: float
    slot: int|None = None
    elo: int = 1500
    sold: int = 0
    image: str

class Vote(BaseModel):
    winner: int
    loser: int

class OperatorApplication(BaseModel):
    id: str|None = None
    name: str
    phone: str
    email: str
    address: str
    notes: str|None = None

# ---------- ROUTES ----------
@app.get("/items", response_model=list[Item])
def get_items():
    return read_db()["items"]

@app.put("/items", response_model=list[Item])
def put_items(payload: list[Item]):
    db = read_db()
    # Convert each Item object in the payload to its dict representation
    db["items"] = [i.model_dump() for i in payload] # Use model_dump() for Pydantic v2+
    write_db(db)
    return db["items"]

@app.post("/vote")
def vote(v: Vote):
    db = read_db()
    items = {i["id"]:i for i in db["items"]}
    if v.winner not in items or v.loser not in items:
        raise HTTPException(status_code=404, detail="Bad IDs") # Corrected HTTPException
    K = 32
    win, lose = items[v.winner], items[v.loser]
    expW = 1/(1+10**((lose["elo"]-win["elo"])/400))
    expL = 1/(1+10**((win["elo"]-lose["elo"])/400))
    win["elo"]  = round(win["elo"]  + K*(1-expW))
    lose["elo"] = round(lose["elo"] + K*(0-expL))
    # Update the items in the db dictionary before writing
    db["items"] = list(items.values())
    write_db(db)
    return {"winner":win, "loser":lose}

@app.post("/operator")
def apply_op(apply: OperatorApplication):
    db = read_db()
    apply.id = str(uuid.uuid4())
    db["apps"].append(apply.model_dump()) # Use model_dump() for Pydantic v2+
    write_db(db)
    return {"status":"received"}
