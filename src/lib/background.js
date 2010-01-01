// vim: fileencoding=utf-8

function backgroundAlert(message){
  alert(message);
}

function backgroundConfirm(message){
  return confirm(message);
}

function backgroundError(message, url){
  var res = confirm(message);
  if(res){
    chrome.tabs.getSelected(null, function(tab){
      chrome.tabs.create({
        index:tab.index+1,
        url:url,
        selected:true
      });
    });
  }
}

function addTab(url, focus){
  chrome.tabs.create({
    url: url,
    selected: focus
  });
}

window.addEventListener('load', function(){
  chrome.self.onConnect.addListener(function(port){
    // connection session
    port.onMessage.addListener(function(item, con){
      var type = item.type;
      if(type === 'request'){
        request_handler(item, con);
      } else if(type === 'post'){
        post_handler(item, con);
      }
    });
  });
  var CHROME_GESTURES = 'jpkfjicglakibpenojifdiepckckakgk';
  var CHROME_KEYCONFIG = 'okneonigbfnolfkmfgjmaeniipdjkgkl';
  var action = {
    group:'Taberareloo',
    actions:[
      {name:'Taberareloo.link'},
      {name:'Taberareloo.quote'},
      {name:'Taberareloo.general'}
    ]
  };
  chrome.extension.sendRequest(CHROME_GESTURES, action);
  chrome.extension.sendRequest(CHROME_KEYCONFIG, action);
}, false);

var request_handler = function(item, con){
  var opt = item.opt;
  var url = item.url;
  var id = item.id;
  return request(url, opt).addCallbacks(function(res){
    con.postMessage({
      type : "request",
      id   : id,
      res  : res,
      success : true
    });
  }, function(res){
    con.postMessage({
      type : "request",
      id   : id,
      res  : res,
      success: false
    });
  });
}

var post_handler = function(item, con){
  var ps = item.ps;
  var id = item.id;
  win = open(chrome.extension.getURL('quickpostform.html'), '_blank', 'alwaysRaised=yes,toolbar=no,directories=no,status=no,menubar=no,scrollbars=no,location=no,dependent=yes,z-lock=yes');
  win.QuickPostForm = {};
  win.ps = ps;
  win.Models = Models
};

var request_v1 = function(url,opt){
  opt = update({
    method: 'GET'
  }, opt || {});
  if(opt.sendContent){
    opt.method = 'POST';
    opt.sendContent = queryString(opt.sendContent, false);
  }
  if(opt.method && opt.method.toUpperCase() === 'POST'){
    if(!opt.headers) opt.headers = [];
    opt.headers.push(['Content-Type', 'application/x-www-form-urlencoded']);
  }
  return doXHR(url, opt);
};

var request = function(url, opt){
  var req = new XMLHttpRequest(), ret = new Deferred();

  opt = update({
    method: 'GET'
  }, opt || {});

  if(opt.queryString){
    var qs = queryString(opt.queryString, true);
    url += qs;
  }

  if(opt.sendContent){
    opt.method = 'POST';
    opt.sendContent = queryString(opt.sendContent, false);
  }

  if('username' in opt){
    req.open(opt.method ? opt.method : (opt.sendContent)? 'POST' : 'GET', url, true, opt.username, opt.password);
  } else {
    req.open(opt.method ? opt.method : (opt.sendContent)? 'POST' : 'GET', url, true);
  }

  if(opt.sendContent){
    req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  } else {
    req.setRequestHeader('Content-Type', 'application/octet-stream');
  }

  if(opt.charset) req.overrideMimeType(opt.charset);

  //req.setRequestHeader("X-Requested-With", "XMLHttpRequest");
  if(opt.headers){
    Object.keys(opt.headers).forEach(function(key){
      req.setRequestHeader(key, opt.headers[key]);
    });
  }

  var position = -1;
  var error = false;

  req.onprogress = function(e){
    position = e.position;
  }
  req.onreadystatechange = function(e){
    if(req.readyState === 4){
      var length = 0;
      try {
        length = parseInt(req.getResponseHeader('Content-Length'), 10);
      } catch(e) {
        console.log('ERROR', e);
      }
      // 最終時のlengthと比較
      if(position !== length){
        if(opt.denyRedirection){
          ret.errback(req);
          error = true;
        }
      }
      if(!error){
        if(req.status >= 200 && req.status < 300){
          ret.callback(req);
        } else {
          ret.errback(req);
        }
      }
    }
  }
  req.send(opt.sendContent);
  return ret;
}

function getSelected(){
  var d = new Deferred();
  chrome.tabs.getSelected(null, function(tab){
    if(TBRL.Service.isEnableSite(tab.url)){
      d.callback(tab);
    }
  });
  return d;
};

var TBRL = {
  // default config
  Config: {
    "version" : "1.0.1",
    "services": {
    },
    "post"    : {
      "tag_provider"      : "HatenaBookmark",
      "tag_auto_complete" : true,
      "ldr_plus_taberareloo" : false,
      "dashboard_plus_taberareloo" : false,
      "googlereader_plus_taberareloo" : false,
      "keyconfig"            : true,
      "shortcutkey_linkquickpost"  : "",
      "shortcutkey_quotequickpost" : "",
      "shortcutkey_quickpost" : "",
      "always_shorten_url"    : false,
      "multi_tumblelogs"      : false
    },
    "entry"   : {
      "trim_reblog_info"  : false,
      "thumbnail_template": ""
    }
  },
  Service: {
    count: 0,
    alertPreference: function(type){
      alert('error.noPoster\n'+type.capitalize().indent(4));
    },
    post: function(ps, posters){
      var self = this;
      var ds   = {};
      posters = [].concat(posters);
      posters.forEach(function(p){
        try{
          ds[p.name] = (ps.favorite && RegExp('^' + ps.favorite.name + '(\\s|$)').test(p.name))? p.favor(ps) : p.post(ps);
        } catch(e){
          ds[p.name] = fail(e);
        }
      });
      return new DeferredHash(ds).addCallback(function(ress){
        var errs = [];
        for(var name in ress){
          var success = ress[name][0], res = ress[name][1];
          if(!success){
            var msg = name + ': ' +
              (res.message.status ? '\n' + ('HTTP Status Code ' + res.message.status).indent(4) : '\n' + res.message.indent(4));
            errs.push(msg);
          }
        }
        if(errs.length){
          errs.push('', 'will you reopen?');
          self.alertError(errs.join('\n'), ps.page, ps.pageUrl, ps);
        } else {
          delete TBRL.Popup.contents[ps.itemUrl];
        }
      }).addErrback(function(err){
        self.alertError(err, ps.page, ps.pageUrl, ps);
      });
    },
    open: function(tab, ps){
      var height = 'height=450';
      if(ps.type === 'quote' || ps.type === 'regular'){
        height = 'height=250'
      }
      var win = window.open(chrome.extension.getURL('popup.html')+'#quick', 'QuickPost '+(TBRL.Service.count++), height+',width=450,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no');
      win.tab = tab;
      win.ps = ps;
    },
    isEnableSite: function(link){
      return link.indexOf('http') === 0;
    },
    alertError: function(error, page, url, ps){
      var res = confirm(error);
      if(res){
        chrome.tabs.create({
          url: url,
          selected: true
        });
      }
    }
  },
  Popup: {
    defaultSuggester: 'HatenaBookmark',
    tags : null,
    tabs: [],
    contents : {},
    suggestionShownDefault: false
  },
  configSet: function(config){
    TBRL.Config = config;
    window.localStorage.options = JSON.stringify(config);
  }
};

if(window.localStorage.options){
  TBRL.Config = update(TBRL.Config, JSON.parse(window.localStorage.options));
} else {
  window.localStorage.options = JSON.stringify(TBRL.Config);
}

if(TBRL.Config.post['multi_tumblelogs']) Models.getMultiTumblelogs();

var onRequestsHandlers = {
  quick: function(req, sender, func){
    getSelected().addCallback(function(tab){
      TBRL.Service.open(tab, req.content);
    });
    func({});
  },
  share: function(req, sender, func){
    getSelected().addCallback(function(tab){
      var ps = req.content;
      if(req.show){
        TBRL.Service.open(tab, ps);
      } else {
        var posters = Models.getDefaults(ps);
        if(!posters.length){
          TBRL.Service.alertPreference(ps.type);
        } else {
          TBRL.Service.post(ps, posters);
        }
      }
      func({});
    }).addErrback(function(e){
    });
  },
  config: function(req, sender, func){
    func(TBRL.Config);
  },
  log: function(req, sender, func){
    console.log.apply(console, req.content);
    func(req.content);
  }
}

chrome.extension.onRequest.addListener(function(req, sender, func){
  var handler = onRequestsHandlers[req.request];
  handler && handler.apply(this, arguments);
});
