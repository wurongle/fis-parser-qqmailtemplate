/*
 * fis
 * http://fis.baidu.com/
 */

'use strict';
var fs = require("fs"),
    path = require("path");


module.exports = function(fisContent, fisFile, fisConf){
	var Conf = fis.config.get('MMCONF');
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
				if(matchs = /^##(.*?)##/.exec($1)){
					return me.wrapStatementWithnewTemplate('*'+matchs[1]+'*');
				}else if(matchs = /^@(else if|if|elseif)[ ]?\((.*?)\)$/.exec($1)){
					var sdm = matchs[2].replace(/=/g,'==').replace(/!/g,'!=').replace(/\|/g,'||').replace(/&/g,'&&');
					sdm = me.parseFunction(sdm);
					sdm = sdm.replace(/(==|\|\||!=|&&)(.*)/g,function (match,$1,$2) {
						return $1 + '"'+$2.replace(/"/g,"\\\"")+'"';
					});
					sdm = [matchs[1].replace(' ',''),' ',sdm].join('');
					return me.wrapStatementWithnewTemplate(sdm);
				}else if(matchs = /^@(endif\)?|else)$/.exec($1)){
					var str = matchs[1].replace(/endif\)?/,'/if');
					return me.wrapStatementWithnewTemplate(str);
				}else if(matchs = /^@(.*?)$/.exec($1)){
					return me.wrapStatementWithnewTemplate(me.parseFunction(matchs[1]));
				}else{
					return match;
					//return me.wrapStatementWithnewTemplate('*'+match[1]+'*');
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
		parseFunction: function(content,next){
			var me = this;
			var hasFun = false;

			content = content.replace('GetCurrentDate()','GetCurrentDate(2013)');
			
			content = content.replace(/([a-zA-Z0-9]+)\(([^()]+)\)/g,function (match,$1,$2) {
				var _args = $2.split(','),
					_rest = '';

				hasFun = true;
				_args.forEach(function (item,index) {
					if(index===0){
						_rest = (next ? _args[0] : me.wrapString(_args[0])) + '|' + $1;
					}else{
						_rest += ':' + (/^##\[/.test(item) ? item : me.wrapString(item) );
					}
				});
				return '##[' + _rest + ']##';
			});
			if(hasFun){
				return me.parseFunction(content,true);
			}else{
				//setvar appendvar hack
				content = content.replace(/(SetVar|AppendVar)\(([a-zA-Z0-9_]+),(.*)\)/,function (match,$1,$2,$3) {
					return '"' + $2 + '"|' + $1 + ':"' + $3.replace(/"/g,'\\"') + '"';
				});

				return content.replace(/##\[/g,'(').replace(/\]##/g,')');
			}
		},
		parseIncludeFile: function (filePath,templateTree) {
			//console.log(filePath);
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
					console.log('include section error.',fisFile.filename,realpath);
				}
				return _section;
			}else{
				var _totalFile = '';
				try{
					_totalFile = fis.util.read(realpath);
				}catch(ex){
					console.log('include total file error.',str[0]+'.html');
				}
				return _totalFile;
			}
		},
		parseValue: function (content) {
			content = content.replace(/{%(.*?)%}/g,function (match,$1) {
				match = match.replace(/(".*?)\$([a-zA-Z0-9_.]+?)(.DATA)?\$(.*?")/g,function (_math,_$1,_$2,_$3,_$4) {
					//console.log(_math);
					return _$1 + "`$" + _$2 + "`" + _$4;
				});
				match = match.replace(/\$([a-zA-Z0-9_.]+?)(.DATA)?\$/g,function (_math,_$1,_$2) {
					return "$" + _$1;
				});
				return match;
			});

			content = content.replace(/\$([a-zA-Z0-9_.]+?)(.DATA)?\$/g,function (math,$1,$2) {
				return Conf.leftDelimiter + "$" + $1 + Conf.rightDelimiter;
			});
			return content;
		},
		parseTemplate: function (content){
			var me = this;
				
			if(!global.tplTree){
				var st = new Date().getTime();
				global.tplTree = me.createTemplateTree(Conf.templateTreeRoot);
				var et = new Date().getTime();
				console.log('createTemplateTree ok,',et-st,' ms.');
			}
			content = me.removeSectionString(content);
			content = me.parseTemplateStatement(content,global.tplTree);
			content = me.parseValue(content);
			content = content.replace(/(<meta[ ].*?charset=["]?)(gb2312|gbk)(["]?.*?>)/ig,'$1utf-8$3');
			
			
			return content;
		},
		wrapStatementWithnewTemplate: function(content){
			return [Conf.leftDelimiter,content,Conf.rightDelimiter].join('');
		},
		wrapString: function (string) {
			return '"'+string.replace(/"/g,'\\"')+'"';
		}
	};
    return Util.parseTemplate(fisContent);
};