#!/usr/bin/env python3

import os
import subprocess
import sys

HERE = os.path.dirname(os.path.realpath(__file__))


def run_command(args):
    # process = subprocess.Popen(shlex.split(command), stdout=subprocess.PIPE)
    process = subprocess.Popen(args, stdout=subprocess.PIPE)
    while True:
        output = process.stdout.readline()
        # if output == '' and process.poll() is not None:  # hangs on Python 3
        if process.poll() is not None:
            break
        if output:
            print(output.strip().decode('utf-8'))
    rc = process.poll()
    return rc


def handle(actual):
    maybe = '' if actual else 'n'
    if not actual:
        print(f'Testing only, use {sys.argv[0]} --actual to upload files')

    args = [
        'rsync',
        '-avz' + maybe,
        '--progress',
        '--delete',
        '--delete-excluded',
        f'--exclude-from={HERE}/upload.exclude',
        f'{HERE}/',
        'client.fathom.info:/var/www/client/sentinel/lookout3/'
    ]

    result = run_command(args)
    if result != 0:
        print(f'Result was {result}.')
    exit(result)


def main():
    actual = False
    if len(sys.argv) > 1:
        if sys.argv[1] == '--actual':
            actual = True
    handle(actual)


if __name__ == "__main__":
    main()
