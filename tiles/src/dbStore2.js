/**
 * Library for handling the storing of map tiles in IndexedDB.
 *
 * Author: Andy Gup (@agup)
 */
var dbStore = function(){

    /**
     * Internal reference to the local database
     * @type {null}
     * @private
     */
    this._db = null;

    /**
     * Private Local ENUMs (Constants)
     * Contains required configuration info.
     * @type {Object}
     * @returns {*}
     * @private
     */
    this._localEnum = (function(){
        var values = {
            DB_NAME : "offline_tile_store"
        }

        return values;
    });

    /**
     * Determines if indexedDB is supported
     * @returns {boolean}
     */
    this.isSupported = function(){
        window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

        if(!window.indexedDB){
            return false;
        }

        return true;
    }

    /**
     * Adds an object to the database
     * @param urlData
     * @param callback callback(boolean, err)
     */
    this.add = function(/* Array */ urlData,callback){
        try{
            var transaction = this._db.transaction(["tilepath"],"readwrite");

            transaction.oncomplete = function(event) {
                callback(true);
            };

            transaction.onerror = function(event) {
                callback(false,event.target.error.message)
            };

            var objectStore = transaction.objectStore("tilepath");
            for (var i in urlData) {
                var request = objectStore.add(urlData[i]);
                request.onsuccess = function(event) {
                    // event.target.result == customerData[i].ssn;
                    console.log("item added to db " + event.target.result);
                };
            }

        }
        catch(err){
            console.log("dbstore: " + err.stack);
            callback(false,err.stack);
        }
    }

    /**
     * Retrieve a record.
     * @param url
     * @param callback
     */
    this.get = function(/* String */ url,callback){
        if(this._db != null){

            var index = this._db.transaction(["tilepath"]).objectStore("tilepath").index("url");
            index.get(url).onsuccess = function(event){
                var result = event.target.result;
                if(result == null){
                    callback(false,"not found");
                }
                else{
                    callback(true,result);
                }
            }
        }
    }

    /**
     * Deletes entire database
     * @param callback callback(boolean, err)
     */
    this.deleteAll = function(callback){
        if(this._db != null){
            var transaction = this._db.transaction(["tilepath"],"readwrite").objectStore("tilepath");
            transaction.clear();
            transaction.onsuccess = function(event){
                callback(true);
            }
            transaction.onerror = function(err){
                callback(false,err);
            }
        }
        else{
            callback(false,null);
        }
    }

    /**
     * Delete an individual entry
     * @param url
     * @param callback callback(boolean, err)
     */
    this.delete = function(/* String */ url,callback){
        if(this._db != null){
            var transaction = this._db.transaction(["tilepath"],"readwrite")
                .objectStore("tilepath")
                .delete(url);
            transaction.onsuccess = function(event){
                callback(true);
            }
            transaction.onerror = function(err){
                callback(false,err);
            }
        }
        else{
            callback(false,null);
        }
    }

    /**
     * Provides a rough, approximate size of database in MBs.
     * @param callback callback(size, null) or callback(null, error)
     */
    this.size = function(callback){
        if(this._db != null){
            var size = 0;

            var transaction = this._db.transaction(["tilepath"])
                .objectStore("tilepath")
                .openCursor();
            transaction.onsuccess = function(event){
                var cursor = event.target.result;
                if(cursor){
                    var url = cursor.value;
                    var json = JSON.stringify(url);
                    size += this.stringBytes(json);
                    cursor.continue();
                }
                else{
                    size = Math.round(((size * 2)/1024/1024) * 100)/100;
                    callback(size,null);
                }
            }.bind(this);
            transaction.onerror = function(err){
                callback(null,err);
            }
        }
        else{
            callback(null,null);
        }
    }

    this.stringBytes = function(str) {
        var b = str.match(/[^\x00-\xff]/g);
        return (str.length + (!b ? 0: b.length));
    }

    this.init = function(callback){

        var request = indexedDB.open(this._localEnum().DB_NAME, 2);

        request.onerror = function(event) {
            console.log("indexedDB error: " + event.target.errorCode);
            callback(false,event.target.errorCode);
        };
        request.onupgradeneeded = (function(event) {
            var db = event.target.result;

            // Create an objectStore to hold information about our map tiles.
            var objectStore = db.createObjectStore("tilepath", {
                autoIncrement: true
            });

            // Create an index to search urls. We may have duplicates
            // so we can't use a unique index.
            objectStore.createIndex("url", "url", { unique: false });
        }.bind(this))

        request.onsuccess = (function(event){
            this._db = event.target.result;
            console.log("database opened successfully");
            callback(true);
        }.bind(this))
    }
}