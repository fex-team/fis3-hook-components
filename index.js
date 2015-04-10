var path = require('path');
var componentsInfo, componentsDir;


function onReleaseStart() {
  // 读取组件信息
  componentsInfo = {};
  componentsDir = (fis.config.env().get('component.dir') || '/components').replace(/\/$/, '');

  if (componentsDir[0] !== '/') {
    componentsDir = '/' + componentsDir;
  }

  var root = fis.project.getProjectPath();
  var includer = new RegExp('^' + fis.util.escapeReg(root + componentsDir + '/') + '.*?component\.json$', 'i');

  // 获取所有 component.json 文件。
  fis.util.find(root, includer).forEach(function(file) {
    var cName = path.basename(path.dirname(file));
    var json;

    try {
      json = require(file)
    } catch (e) {
      fis.log.warning('unable to load component.json of [' + cName + ']');
    }

    json.name = json.name || cName;
    componentsInfo[json.name] = json;
  });
}

function findResource(name, path, finder) {
  finder = finder || fis.uri;
  var extList = ['.js', '.jsx', '.coffee', '.css', '.sass', '.scss', '.less', '.html', '.tpl', '.vm'];
  var info = finder(name, path);

  for (var i = 0, len = extList.length; i < len && !info.file; i++) {
    info = finder(name + extList[i], path);
  }

  return info;
}

function onFileLookUp(info, file) {
  // 如果已经找到了，没必要再找了。
  if (info.file || file.useShortPath === false) {
    return;
  }

  var m = /^([0-9a-zA-Z-_]+)(?:\/(.+))?$/.exec(info.rest);
  if (m) {
    var cName = m[1];
    var subpath = m[2];
    var config = componentsInfo[cName] || {};
    var resolved;

    if (subpath) {
      resolved = findResource(componentsDir + '/' + cName + '/' + subpath, file.dirname);
    } else {
      resolved = findResource(componentsDir + '/' + cName + '/' + (config.main || 'index'), file.dirname);
    }

    // 根据规则找到了。
    if (resolved.file) {
      info.id = resolved.file.getId();
      info.file = resolved.file;
    }
  }
}


module.exports = function(fis, opts) {
  fis.on('release:start', onReleaseStart);
  fis.on('lookup:file', onFileLookUp);
};
