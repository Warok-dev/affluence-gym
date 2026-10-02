import os
import tempfile

# Before any `import app`: isolated database, no background task during tests.
os.environ.setdefault("DB_PATH", os.path.join(tempfile.mkdtemp(), "test.db"))
os.environ["SNAPSHOT_ENABLED"] = "false"
