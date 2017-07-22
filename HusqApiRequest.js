const EventEmitter = require('events');
const request = require("request");
const HMower = require("./HMower");

/**
 *
 */
class HusqApiRequest extends EventEmitter {
    constructor() {
        super(); // idk what this is for yet
        this.authUrl = 'https://iam-api.dss.husqvarnagroup.net/api/v3/';
        this.trackUrl = 'https://amc-api.dss.husqvarnagroup.net/v1/';
        this.headers = {
            "Content-type": "application/json",
            "Accept": "application/json"
        };
        this.robots = []; // Array of HMowers
        this.token = null;
        this.provider = null;
    }

    /**
     * @param {string} username - Email address
     * @param {string} password
     * @fires HusqApiRequest#login
     */
    login(username, password) {
        request({
            url: this.authUrl + 'token',
            method: "POST",
            json: true,
            headers: this.headers,
            body: {
                data: {
                    type: "token",
                    attributes: {
                        username: username,
                        password: password,
                    }
                }
            }
        }, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                console.log(body);
            } else if (error) {
                console.log("error: " + error);
                console.log("response.statusCode: " + response.statusCode);
                console.log("response.statusText: " + response.statusText);
            } else {
                // noinspection Annotator
                if (body.errors) {
                    // noinspection Annotator
                    body.errors.forEach(function (e) {
                        console.log('(' + e.status + ') ' + e.title + ': ' + e.detail);
                    });
                } else {
                    this.token = body.data.id;
                    this.provider = body.data.attributes.provider;
                    //this.loginExpiry = body.data.attributes.expires_in;
                    //this.loginExpires = new Date() + body.data.attributes.expires_in;
                    this.headers.Authorization = "Bearer " + body.data.id;
                    this.headers['Authorization-Provider'] = body.data.attributes.provider;

                    /**
                     * @event HusqApiRequest#login
                     */
                    this.emit('login');
                }
            }
        });
    }

    /**
     * Only kills authentication on this object... don't bother using this yet.
     */
    logout() {
        // TODO, send DELETE request to authUrl + token/{this.token}
        this.token = null;
        this.headers.Authorization = null;
    }

    /**
     * Gets a list of mowers
     * @fires HusqApiRequest#mowerUpdate
     */
    getMowers() {
        let mowers = [];
        request({
            url: this.trackUrl + 'mowers',
            headers: this.headers,
            method: "GET"
        }, (error, response, body) => {
            if (error) {
                console.log(error);
            } else if (response.statusCode !== 200) {
                console.log(response.statusCode);
                console.log(response.statusText);
            } else {
                mowers = JSON.parse(body);
                // No failures; clear the robots list before we start pushing new ones to it.
                this.robots = [];
                mowers.forEach((m) => {
                    this.robots.push(new HMower(m, this.trackUrl, this.headers));
                });
                /**
                 * @event HusqApiRequest#mowerUpdate
                 */
                this.emit("mowerUpdate", this.robots);
            }
        });
    }
}

// noinspection Annotator
module.exports = HusqApiRequest;