from llm import interface


def general_advice(transactions: list) -> str:
    prompt = (
        "you are a personal finance advisor here is a list of my transactions "
        "with names, amounts, and directions. analyze my spending patterns and "
        "tell me what I'm spending too much on and what I should cut back on "
        f"be specific and concise. Transactions: {str(transactions)}"
    )
    return interface.prompt(prompt)


def goal_advice(goal, transactions: list) -> str:
    prompt = (
        "you are a personal finance advisor\n"
        f"here is my goal: {goal}\n"
        f"here are my recent transactions: {str(transactions)}\n"
        "based on my spending patterns and savings rate, tell me when I can "
        "realistically afford this and what I should cut back on to get there "
        "faster\n"
        "be specific and concise"
    )
    return interface.prompt(prompt)
