import json
import logging


class SafeFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps(
            {
                key: getattr(record, key, None)
                for key in ("path", "status", "duration_ms", "error_code")
            }
        )


def configure_logging():
    logger = logging.getLogger("genznect")
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(SafeFormatter())
        logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False
