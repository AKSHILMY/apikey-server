from apikeys import APIKeyDepends

require_read = APIKeyDepends(required_scopes=["read"])
require_write = APIKeyDepends(required_scopes=["write"])
require_admin = APIKeyDepends(required_scopes=["admin"])
