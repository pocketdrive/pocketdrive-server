#!/bin/bash

username="dulaj"
smbuser="dulaj"
smbpasswd="1234"

# Seed DB
rm -rf ~/.pocketdrive
mkdir ~/.pocketdrive

cp db/* ~/.pocketdrive

# Seed sample user storage hierachy

cd ~
rm -rf pocketdrive
mkdir pocketdrive

cd pocketdrive
mkdir $username
cd $username

mkdir Documents
mkdir Movies
mkdir Music
mkdir -p Office/Projects

touch Notes.txt
echo "This is a test document" >> Notes.txt

# Edit smb.conf
sudo su
printf "\n[$username]\npath = ~/pocketdrive/$username\nvalid users = $smbuser\nread only = no" | sudo tee --append /etc/samba/smb.conf > /dev/null
sudo service smbd restart