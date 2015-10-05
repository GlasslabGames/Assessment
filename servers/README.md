Assessment Engine Data Pipeline Server
========
This is the GlassLab assessment engine data pipeline server.
It is a nodeJS web server, that looks at the job queue in regular intervals and run assessment processing using various engines.

Dependencies
------------
1. **Node.js**
2. **Forever** process manager
    * Use NPM to install forever process manager globally
    ```sh
    $ sudo npm install forever -g
    ```
3. **Redis** - Local or remote instance
    * Redis is the Job Q, so the platform and the assessment engine should use the same redis instance)


OSX Installation
------------
1. Install **Brew**
   * http://brew.sh/
    ```sh
    $ ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
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
4. Install **Redis**
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
2. In a browser go to [http://localhost:8003](http://localhost:8003)


Configs
---------------
* A default config is stored in **"config.json"**
* If you place **"hydra.assessment.config.json"** in the home directory of the user running the assessment server process. 
The server will load and override some or all configs in the default config file.

