echo "------------------>>> Install npm/node.js 8.x"
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs

npm install


# --------------------------------- RethinkDB ---------------------------
echo
echo "------------------>>> Install RethinkDB "
source /etc/lsb-release && echo "deb http://download.rethinkdb.com/apt $DISTRIB_CODENAME main" | sudo tee /etc/apt/sources.list.d/rethinkdb.list
wget -qO- https://download.rethinkdb.com/apt/pubkey.gpg | sudo apt-key add -
sudo apt-get update
sudo apt-get install rethinkdb


echo "------------------>>> Installl RethinkDB "
sudo cp deploy/pendo1.conf /etc/rethinkdb/instances.d/
sudo service rethinkdb restart


echo "------------------>>> Install rethinkDB python tools"
sudo pip install rethinkdb


echo "------------------>>> Install local packages "
npm run deploy

npm start
