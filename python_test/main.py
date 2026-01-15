import sys

def main():
    # sys.argv[0] is the script name itself, the rest are arguments passed.
    args = sys.argv[1:]
    
    if not args:
        print("입력된 파라미터가 없습니다.")
        return

    print(f"받은 파라미터 개수: {len(args)}")
    for i, arg in enumerate(args, 1):
        print(f"파라미터 {i}: {arg}")


if __name__ == "__main__":
    main()
