import fetch from 'node-fetch';

class PingClass {
    Ping(url: URL) {
        return fetch(url);
    }
}

export default PingClass;
