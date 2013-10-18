/*
 * fis
 * http://fis.baidu.com/
 */

'use strict';
var fs = require("fs"),
    path = require("path");


module.exports = function(fisContent, fisFile, fisConf){
	var Conf = {
		templateExtnames:['.html'],
		noTemplateFolder:['htdocs','images','style','css','.svn'],
		leftDelimiter:"{%",
		rightDelimiter:"%}",
		'css_path':'/htdocs/zh_CN/htmledition/style/',
	    'images_path':'/htdocs/zh_CN/htmledition/images/',
	    'js_path':'/htdocs/zh_CN/htmledition/js/'
	};
	var Util = {
		/**
		 * 获取文件列表
		 * @param  {string} p
		 * @return {array}
		 */
		getFileList: function (p) {
			var me = this,
				fileList = [],
				_getFileList = function (p) {
					var files = fs.readdirSync(p);
					var list = files.map(function (file) {
							return path.join(p, file);
						}).filter(function (file) {
							if(fs.statSync(file).isDirectory()){
								// 检测无需遍历白名单
								if(Conf.noTemplateFolder.indexOf(path.basename(file)) == -1){
									_getFileList(file);
								}else{
									return [];
								}
							}
							return fs.statSync(file).isFile();
						});
					fileList = fileList.concat(list);
					return fileList;
				};

			return _getFileList(p);
		},
		/**
		 * 生成模版树
		 * @param  {string} content
		 * @return {object}
		 */
		createTemplateTree: function (p) {
			var me = this,
				fileList = me.getFileList(p),
				templateTree = {};

			fileList = fileList.filter(function (file) {
				var currentFileExtname = path.extname(file),
					templateExtnames = Conf.templateExtnames;

				return (templateExtnames.indexOf(currentFileExtname) > -1);
			});

			fileList.forEach(function (file) {
				var content = fis.util.read(file);
				var realpath = fis.util.realpath(file);
				templateTree[realpath] = {};
				me.parseSection(content,function (match,$1,$2,$3,index,_content) {
					templateTree[realpath][$1] = $2;
				});
			});
			return templateTree;
		},
		/**
		 * 解析模版片段
		 * @param  {string}   content
		 * @param  {Function} callback
		 * @return {none}
		 */
		parseSection: function (content,callback) {
			//<%#tMobile_head%>00<%#/tMobile_head%>
			content.replace(/<%#([a-zA-Z_]+)%>([\s\S]*?)(<%#\/\1%>)/g,function (match,$1,$2,$3,index,_content) {
				callback(match,$1,$2,$3,index,_content);
			});
		},
		removeSectionString: function (content) {
			var me = this;
			me.parseSection(content,function (match,$1,$2,$3,index,_content) {
				content = content.replace(match,'');
			});
			return content;
		},
		/**
		 * 解析模版语句
		 * @param  {string} content
		 * @return {string}
		 */
		parseTemplateStatement: function (content,templateTree) {
			var me = this;
			content = content.replace(/<%#include\((#?[a-zA-Z0-9-_#]+)\)%>/g,function (match,$1) {
				return me.parseIncludeFile($1,templateTree);
			});
			content = content.replace(/<%(.*?)%>/g,function (match,$1) {
				var matchs;
				/*if(matchs = /^#include\((#?[a-zA-Z0-9-_#]+)\)/.exec($1)){
					return me.parseIncludeFile(matchs[1],templateTree);
				}else */if(matchs = /^##(.*?)##/.exec($1)){
					return me.wrapStatementWithnewTemplate('*'+matchs[1]+'*');
				}else if(matchs = /^@(else if|if)[ ]?\((.*?)\)$/.exec($1)){
					var sdm = matchs[2].replace(/=/g,'==').replace(/!/g,'!=').replace(/\|/g,'||').replace(/&/g,'&&');
					sdm = me.parseFunction(sdm);
					sdm = sdm.replace(/\$?[a-zA-Z0-9-_.]+\$?/g,function (match) {
						return '"'+match+'"';
					});
					sdm = [matchs[1].replace(' ',''),' ',sdm].join('');
					return me.wrapStatementWithnewTemplate(sdm);
				}else if(matchs = /^@(endif|else)$/.exec($1)){
					var str = matchs[1].replace('endif','/if');
					return me.wrapStatementWithnewTemplate(str);
				}else if(matchs = /^@(.*?)$/.exec($1)){
					return me.wrapStatementWithnewTemplate(me.parseFunction(matchs[1]));
				}else{
					return match;
				}

			});
			content = content.replace('=='+Conf.rightDelimiter,'==""'+Conf.rightDelimiter).replace('!='+Conf.rightDelimiter,'!=""'+Conf.rightDelimiter);
			return content;
		},
		/**
		 * 解析模版函数
		 * @param  {string} content
		 * @param  {string} postfix
		 * @return {string}
		 */
		parseFunction: function(content,postfix){
			var me = this;

			content = content.replace(/GetVar\(([a-zA-Z0-9_]+)\)/g,function(match,$1){
				return '$_t' + $1;
			});

			content = content.replace(/SetVar\(([a-zA-Z0-9_]+)[ ]?,[ ]?(.*?)\)/g,function(match,$1,$2){
				return '$_t'+$1+'="'+$2+'"';
			});

			content = content.replace(/AppendVar\(([a-zA-Z0-9_]+)[ ]?,[ ]?(.*?)\)/g,function(match,$1,$2){
				if($2){
					return '$_t'+$1+'='+'$_t'+$1+'+"'+$2+'"';
				}else{
					return '*'+match+'*';
				}
			});
			content = content.replace(/GetResFullName\(\$([a-zA-Z0-9_]+)\$([a-zA-Z0-9-_./]+)\)/g,function(match,$1,$2){
				return '"'+ Conf[$1] + $2 + '"';
			});

			return content;
		},
		parseIncludeFile: function (filePath,templateTree) {
			if(filePath && filePath.charAt(0)==='#'){
				filePath = fisFile.filename+filePath;
			}
			filePath = '.' + fisFile.subdirname + '/' + filePath;
			var str = filePath.split('#');
			var realpath = fis.util.realpath(str[0]+'.html');
			var section = str[1];
			if(section){
				var _section = '';
				try{
					_section = templateTree[realpath][section];
				}catch(ex){
					console.log('include section error, no such section?! , realpath:',realpath);
				}
				return _section;
			}else{
				var _totalFile = '';
				try{
					_totalFile = fis.util.read(realpath);
				}catch(ex){
					console.log('include total file error, no such file?! , path:',str[0]+'.html');
				}
				return _totalFile;
			}
		},
		parseTemplate: function (content){
			var me = this,
				templateTree = null;

			if(!global.tplTree){ 
				console.log('createTemplateTree.');
				global.tplTree = me.createTemplateTree('./');
			}
			templateTree = global.tplTree;
			content = me.removeSectionString(content);
			return me.parseTemplateStatement(content,templateTree);
		},
		wrapStatementWithnewTemplate: function(content){
			return [Conf.leftDelimiter,content,Conf.rightDelimiter].join('');
		}
	};
    return Util.parseTemplate(fisContent);
};