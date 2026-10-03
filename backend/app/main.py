import asyncio
import contextlib
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import ALLOWED_ORIGINS, SNAPSHOT_ENABLED
from .db import init_db
from .routes import router
from .scheduler import alerts_loop, snapshot_loop

init_db()


@asynccontextmanager
async def lifespan(_: FastAPI):
    tasks = [asyncio.create_task(alerts_loop())]
    if SNAPSHOT_ENABLED:
        tasks.append(asyncio.create_task(snapshot_loop()))
    yield
    for task in tasks:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task


app = FastAPI(title="Affluence Gym API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    # DELETE + X-Alert-Token: cancelling a quiet-gym alert from the site's own origin.
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "X-Alert-Token"],
)
app.include_router(router)
