import os
import logging
import json
import firebase_admin
from firebase_admin import credentials, firestore, auth
from app.core.config import settings
print("🔥 firebase_config.py loaded")

logger = logging.getLogger("netra.firebase")
logger.setLevel(logging.INFO)

db = None
firebase_initialized = False

# Local mock DB implementation for offline/pre-config testing
class MockFirestoreCollection:
    def __init__(self, name, parent_db):
        self.name = name
        self.parent_db = parent_db

    def document(self, doc_id):
        return MockFirestoreDocument(self.name, doc_id, self.parent_db)

    def add(self, data, document_id=None):
        if not document_id:
            import uuid
            document_id = str(uuid.uuid4())
        self.parent_db._write(self.name, document_id, data)
        return MockFirestoreDocument(self.name, document_id, self.parent_db), MockFirestoreDocumentReference(document_id)

    def get(self):
        docs = self.parent_db._get_all(self.name)
        return [MockFirestoreDocumentSnapshot(k, v) for k, v in docs.items()]

    def where(self, field, operator, value):
        # Extremely simplified query helper for mock
        return MockQuery(self, field, operator, value)

    def order_by(self, field, direction="ASCENDING"):
        return MockQuery(self).order_by(field, direction)

class MockQuery:
    def __init__(self, collection, field=None, operator=None, value=None):
        self.collection = collection
        self.filters = []
        if field:
            self.filters.append((field, operator, value))
        self.sort_field = None
        self.sort_desc = False

    def where(self, field, operator, value):
        self.filters.append((field, operator, value))
        return self

    def order_by(self, field, direction="ASCENDING"):
        self.sort_field = field
        self.sort_desc = (direction == "DESCENDING")
        return self

    def limit(self, num):
        # We can implement limit if needed, return self for mock
        return self

    def get(self):
        docs = self.collection.parent_db._get_all(self.collection.name)
        results = []
        for k, v in docs.items():
            match = True
            for field, op, val in self.filters:
                doc_val = v.get(field)
                if op == "==" and doc_val != val:
                    match = False
                elif op == "in" and doc_val not in val:
                    match = False
                elif op == ">" and not (doc_val and doc_val > val):
                    match = False
                elif op == "<" and not (doc_val and doc_val < val):
                    match = False
            if match:
                results.append(MockFirestoreDocumentSnapshot(k, v))
        
        if self.sort_field:
            results.sort(key=lambda x: x.to_dict().get(self.sort_field, ""), reverse=self.sort_desc)
        return results

class MockFirestoreDocumentSnapshot:
    def __init__(self, doc_id, data):
        self.id = doc_id
        self._data = data
        self.exists = data is not None

    def to_dict(self):
        return self._data

class MockFirestoreDocumentReference:
    def __init__(self, doc_id):
        self.id = doc_id

class MockFirestoreDocument:
    def __init__(self, collection_name, doc_id, parent_db):
        self.collection_name = collection_name
        self.id = doc_id
        self.parent_db = parent_db

    def get(self):
        data = self.parent_db._read(self.collection_name, self.id)
        return MockFirestoreDocumentSnapshot(self.id, data)

    def set(self, data, merge=True):
        self.parent_db._write(self.collection_name, self.id, data, merge)
        return self

    def update(self, data):
        self.parent_db._update(self.collection_name, self.id, data)
        return self

    def delete(self):
        self.parent_db._delete(self.collection_name, self.id)
        return self

class MockFirestoreDatabase:
    def __init__(self):
        self.filepath = os.path.join(os.getcwd(), "mock_database.json")
        self.data = {}
        self._load()

    def _load(self):
        if os.path.exists(self.filepath):
            try:
                with open(self.filepath, "r") as f:
                    self.data = json.load(f)
            except Exception as e:
                logger.error(f"Error loading mock database: {e}")
                self.data = {}
        else:
            self.data = {}

    def _save(self):
        try:
            with open(self.filepath, "w") as f:
                json.dump(self.data, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving mock database: {e}")

    def collection(self, name):
        return MockFirestoreCollection(name, self)

    def _read(self, collection, doc_id):
        return self.data.get(collection, {}).get(doc_id, None)

    def _get_all(self, collection):
        return self.data.get(collection, {})

    def _write(self, collection, doc_id, data, merge=True):
        if collection not in self.data:
            self.data[collection] = {}
        if doc_id not in self.data[collection] or not merge:
            self.data[collection][doc_id] = data
        else:
            self.data[collection][doc_id].update(data)
        self._save()

    def _update(self, collection, doc_id, data):
        if collection in self.data and doc_id in self.data[collection]:
            self.data[collection][doc_id].update(data)
            self._save()

    def _delete(self, collection, doc_id):
        if collection in self.data and doc_id in self.data[collection]:
            del self.data[collection][doc_id]
            self._save()


try:
    # 1. Check if a local firebase-key.json service account credentials file exists
    key_path = os.path.join(os.getcwd(), "firebase-key.json")
    backend_key_path = os.path.join(os.getcwd(), "backend", "firebase-key.json")

    selected_key_path = None
    if os.path.exists(key_path):
        selected_key_path = key_path
    elif os.path.exists(backend_key_path):
        selected_key_path = backend_key_path

    if selected_key_path:
        print("✅ Firebase key found:", selected_key_path)

        cred = credentials.Certificate(selected_key_path)

        firebase_admin.initialize_app(
            cred,
            {
                "storageBucket": settings.FIREBASE_STORAGE_BUCKET
            }
        )

        db = firestore.client()

        print("✅ Connected to Firebase Firestore")

        firebase_initialized = True
        logger.info(
            f"Firebase Admin SDK successfully initialized using key file: {selected_key_path}"
        )

    elif settings.FIREBASE_CLIENT_EMAIL and settings.FIREBASE_PRIVATE_KEY:
        private_key = settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n")

        cred_dict = {
            "type": "service_account",
            "project_id": settings.FIREBASE_PROJECT_ID,
            "private_key": private_key,
            "client_email": settings.FIREBASE_CLIENT_EMAIL,
            "token_uri": "https://oauth2.googleapis.com/token",
        }

        cred = credentials.Certificate(cred_dict)

        firebase_admin.initialize_app(
            cred,
            {
                "storageBucket": settings.FIREBASE_STORAGE_BUCKET
            }
        )

        db = firestore.client()
        firebase_initialized = True

    else:
        print("❌ Firebase credentials missing")
        db = MockFirestoreDatabase()

except Exception as e:
    print("❌ Firebase initialization failed")
    print(e)
    db = MockFirestoreDatabase()