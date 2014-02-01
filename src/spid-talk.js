/*global SPiD:false*/
;(function(exports) {

    var _scriptObject,
        _callbacks = {},
        _requestQueue = [],
        _timer = null;

    function _guid() {
        return 'f' + (Math.random() * (1<<30)).toString(16).replace('.', '');
    }

    function _createCallback(callback) {
        var id = _guid();
        _callbacks[id] = function(err, res) {
            callback(err, res);
        };
        return id;
    }

    function _queue(id, url) {
        _requestQueue.push({id:id, url:url});
    }

    function _isProcessing() {
        return _timer !== null;
    }

    function _processQueue() {
        if(!_isProcessing() && _requestQueue.length > 0) {
            var node = _requestQueue.shift();
            _send(node);
        }
    }

    function _send(node) {
        var options = exports.options();
        _createScriptObject(node);
        _timer = window.setTimeout(function() {
            _failure('Timeout reached', node.id);
        }, options.timeout);
    }

    function _createScriptObject(node) {
        _scriptObject = document.createElement('SCRIPT');
        _scriptObject.src = node.url;
        _scriptObject.type = 'text/javascript';
        _scriptObject.onerror = function() {
            _failure('Browser triggered error', node.id);
        };
        var head = document.getElementsByTagName('HEAD')[0];
        head.appendChild(_scriptObject);
    }

    function _failure(message, id) {
        exports.Log.error(message);
        _done(id, {'error': {'type': 'communication', 'code': 503, 'description': message}, 'response': {}});
    }

    function _done(id, data) {
        window.clearTimeout(_timer);
        _timer = null;
        _removeScriptObject();
        _processQueue();

        if(_callbacks[id]) {
            var f = _callbacks[id];
            _callbacks[id] = null;
            var err = data['error'] ? data['error'] : null,
                res = data['response'] ? data['response'] : data;
            f(err, res);
        }
    }

    function _removeScriptObject() {
        if(_scriptObject) {
            _scriptObject.parentNode.removeChild(_scriptObject);
            _scriptObject = null;
        }
    }

    function request(server, path, params, callback) {
        var id = _createCallback(callback);
        params = params || {};
        params.callback = id;
        var url = exports.Util.buildUri(server, path, params);
        exports.Log.info('Request: ' + url);
        _queue(id, url);
        _processQueue();
    }

    function response(id, data) {
        exports.Log.info('Response received');
        _done(id, data);
    }

    exports.Talk = {
        request: request,
        response: response
    };

}(SPiD));