GlassLab Game Service Platform (Hydra)
========
This is the Glasslab game service platform server.
It is a nodeJS web server. nodeJS servers is used for producing REST endpoints. Angular is used for frontend rendering and navigation.


Requirments
------------
OSX with 8GB or ram


Installation
------------
1. Install **Brew**
   * http://brew.sh/
    ```sh
    $ ruby -e "$(curl -fsSL https://raw.github.com/mxcl/homebrew/go/install)"
    ```
2. Install **Node.js**
   * Use Brew to install node
   ```sh
   $ brew install node
   ```
3. Install **Forever** node process manager
  * Use NPM to install forever process manager globally
  ```sh
  $ sudo npm install forever -g
  ```
4. Install **MySQL**
   1. Use Brew to install MySQL
    ```sh
    $ brew install mysql
    $ ln -sfv /usr/local/opt/mysql/*.plist ~/Library/LaunchAgents
    $ launchctl load ~/Library/LaunchAgents/homebrew.mxcl.mysql.plist
    ```
   2. Verify by running
      * List all Brew services
      ```sh
      $ brew services list
      ```
      * This should display "mysql      started..."
   3. Add MySQL user and Import SQL Schema data
        * Change to "local" dir and run setup_db.sh script
        ```sh
        $ cd local
        $ ./setup_db.sh
        ```
        * This will create a DB called **"glasslab_dev"** and a user named **"glasslab"** with password **"glasslab"**
5. Install **Redis**
   1. Use Brew to install redis
      ```sh
      $ brew install redis
      $ mkdir ~/Library/LaunchAgents
      $ ln -sfv /usr/local/opt/redis/*.plist ~/Library/LaunchAgents
      $ launchctl load ~/Library/LaunchAgents/homebrew.mxcl.redis.plist
      ```

      * Note: to restart the redis brew service, use the following command

      ```sh
      $ brew services restart redis
      ```

      * If the service does not start automatically, you can start manually by running:

      ```sh
      $ redis-server /usr/local/etc/redis.conf
      ```

      * You may need to kill extraneous redis process with:

      ```sh
      $ pkill -f redis
      ```

6. Install/Setup **Couchbase** Server
   1. Download: http://packages.couchbase.com/releases/2.2.0/couchbase-server-community_2.2.0_x86_64.zip
   2. Extract and Install App
   3. Login into admin console [http://localhost:8091](http://localhost:8091)
   4. Create user (remember the username/password this is your admin account) 
   5. Create Server (use default settings with a minimum of 512MB for the servers memory)
     * Note you can NOT edit the mem usage later, so it's recommended to leave it at default or all memory. The memory is a cap for all the buckets caps, it will not pre-allocat this memory so it's safe to put a high cap here.
   6. For the default bucket choose the 100MB (minimal size) for ram
     * You can delete this bucket later it's not used
   7. Add the required buckets
     * Select "Data Buckets" from the admin console
        * Create two data buckets
           1. Click "Create New Data Bucket"
               1. Name: "glasslab_gamedata"
               2. RAM Quota: 100MB to 512MB this depends on how much ram you have free on your system. The higher the number the faster the data can be accessed.
               3. Access Control: Standard port password "glasslab"
               4. Replicas: uncheck "Enable"
               5. Click Create button at bottom of modal.
           2. Click "Create New Data Bucket" again
               1. Name: "glasslab_webapp"
               2. RAM Quota: 100MB to 512MB this depends on how much ram you have free on your system. The higher the number the faster the data can be accessed.
               3. Access Control: Standard port password "glasslab"
               4. Replicas: uncheck "Enable"
               5. Click Create button at bottom of modal.
7. Installation Complete

Running the app
---------------
1. Start/Stop/Restart servies
  * To start services run the following command:
  ```sh
  $ ./service.sh start
  ```
  * To stop services run the following command:
  ```sh
  $ ./service.sh stop
  ```
  * To restart services run the following command:
  ```sh
  $ ./service.sh restart
  ```
2. In a browser go to [http://localhost:8001](http://localhost:8001)

