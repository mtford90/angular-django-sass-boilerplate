#!/usr/bin/python

import os

from fabric.state import env
from fabric.operations import put, run, sudo

env.user = 'mtford'
env.host_string = 'mtford.co.uk:22853'
env.key_filename = '/Users/mtford/.ssh/id_rsa'

SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))

def main():
    put(SCRIPT_DIR + '/../bin/*', '/home/mtford/breakdown/')

if __name__ == '__main__':
    main()
