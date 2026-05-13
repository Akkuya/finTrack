import csv, os

def read(file: os.PathLike) -> list[dict]:
    """
    Opens the list of transactions and returns an array of dictionaries. 
    """
    transactions=[]
    with open(file) as f:
        reader = csv.DictReader(f)
        for row in reader:
            transactions.append(row)
    return transactions