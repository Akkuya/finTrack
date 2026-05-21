import logging

from ollama import ChatResponse, ResponseError, chat

logger = logging.getLogger(__name__)


def prompt(message: str) -> str:
    try:
        logger.debug("Sending prompt to LLM (%d chars)", len(message))
        response: ChatResponse = chat(
            model="llama3.1:8b",
            options={"temperature": 0},
            messages=[
                {"role": "user", "content": message},
            ],
        )
        result = response["message"]["content"]
        logger.debug("LLM response received (%d chars)", len(result))
        return result
    except ResponseError as e:
        logger.error("Ollama error: %s", e)
        return "LLM unavailable. Check that Ollama is running."
    except Exception as e:
        logger.exception("Unexpected LLM error: %s", e)
        return "An error occurred while generating advice."
