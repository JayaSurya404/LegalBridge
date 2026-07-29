"""Standard Python logging configuration."""

import logging


def configure_logging(log_level: str) -> None:
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    logging.getLogger("legalbridge").setLevel(log_level)
