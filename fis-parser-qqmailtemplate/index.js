/*
 * fis
 * http://fis.baidu.com/
 */

'use strict';
var fs = require("fs"),
    path = require("path");

global.gTemplateTree = null;

module.exports = function(fisContent, fisFile, fisConf){

	var util = {
		tplVarPrex:'$_t',
		tplL:'{%',
		tplR:'%}',
		fileList:[],
		fileType:['.html','.php'],
		valueMap:{
			'css_path':'/htdocs/zh_CN/htmledition/style/',
			'images_path':'/htdocs/zh_CN/htmledition/images/',
			'js_path':'/htdocs/zh_CN/htmledition/js/'
		},
		getFileList: function (p) {
			var me = this;
			var files = fs.readdirSync(p);
			var list = files.map(function (file) {
					return path.join(p, file);
				}).filter(function (file) {
					if(fs.statSync(file).isDirectory()){
						me.getFileList(file);
					}
					return fs.statSync(file).isFile();
				});

			/*list.forEach(function (file) {
		        console.log("===%s (%s)", file, path.extname(file));
		    });*/

			me.fileList = me.fileList.concat(list);
		},
		getTemplateFileList: function (p,fileType) {
			var me = this,
				type,
				list;

			me.getFileList(p);
			if(!fileType){
				fileType = me.fileType;
			}
			list = me.fileList.filter(function (file) {
				type = path.extname(file);
				return (fileType.indexOf(type) > -1);
			});
			return list;
		},
		parseSection: function (content,callback) {
			//<%#tMobile_head%>00<%#/tMobile_head%>
			content.replace(/<%#([a-zA-Z_]+)%>([\s\S]*?)(<%#\/\1%>)/g,function (match,$1,$2,$3,index,_content) {
				callback(match,$1,$2,$3,index,_content);
			});
		},
		createTemplateTree: function (p) {
			var me = this,
				fileList = me.getTemplateFileList(p);

			gTemplateTree = {};
			fileList.forEach(function (file) {

				var content = fis.util.read(file);
				var realpath = fis.util.realpath(file);
				gTemplateTree[realpath] = {};
				me.parseSection(content,function (match,$1,$2,$3,index,_content) {
					gTemplateTree[realpath][$1] = $2;
				});
			});
			console.log(fileList.length);
		},
		handleIncluedFile: function (content) {
			content = content.replace(/<%#include\((#?[a-zA-Z0-9-_#]+)\)%>/g,function(match,$1,index,_content){
				
				if($1 && $1.charAt(0)==='#'){
					$1 = fisFile.filename+$1;
				}
				$1 = '.' + fisFile.subdirname + '/' + $1;
				var str = $1.split('#');
				var realpath = fis.util.realpath(str[0]+'.html');
				var section = str[1];
				if(section){
					var _section = '';
					try{
						_section = gTemplateTree[realpath][section];
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
				
			});
			//console.log(content,fisFile);
			return content;
		},
		removeSectionString: function (content) {
			var me = this;
			me.parseSection(content,function (match,$1,$2,$3,index,_content) {
				content = content.replace(match,'');
			});
			return content;
		},
		encodeTemplate: function (content) {
			content = content.replace(/charset=gb2312/,'charset=utf-8');
			return content;
		},
		parseTemplateValue: function (content) {
			var me = this;
			// <%@GetResFullName($images_path$weixin/card/btn_download.png)%>
			// <%@GetResFullName($css_path$w_wap.css)%>
			content = content.replace(/<%@GetResFullName\(\$([a-zA-Z0-9_]+)\$([a-zA-Z0-9-_./]+)\)%>/g,function(match,$1,$2){
				//console.log(match);
				return me.valueMap[$1] + $2;
			});

			//<%@SetVar(QQName,$QQName.DATA$)%>
			//<%@AppendVar(ExtendUrlParams,)%>
			//<%@GetVar(muin)%>
			//<%@if($s$=addfriend)%>xx<%@else%>xx<%@endif%>
			/*content = content.replace(/<%.*?%>/g,function (match) {
				return ' ';
			});*/
			//<%@SetVar(QQName,$QQName.DATA$)%>
			//<%@if($s$=addfriend)%>xx<%@else%>xx<%@endif%>
			content = content.replace(/<%(.*?)%>/g,function (match,$1) {
				var comments,getVar,setVar,appendVar,_if;
				if(comments = /^##(.*?)##/.exec($1)){
					return [me.tplL,'*'+comments[1]+'*',me.tplR].join('');
				}else if(getVar = /@GetVar\(([a-zA-Z0-9_]+)\)/.exec($1)){
					return [me.tplL,me.tplVarPrex+getVar[1],me.tplR].join('');
				}else if(setVar = /@SetVar\(([a-zA-Z0-9_]+)[ ]?,[ ]?(.*?)\)/.exec($1)){
					return [me.tplL,me.tplVarPrex+setVar[1]+'="'+setVar[2]+'"',me.tplR].join('');
				}else if(appendVar = /@AppendVar\(([a-zA-Z0-9_]+)[ ]?,[ ]?(.*?)\)/.exec($1)){
					if(appendVar[2]){
						return [me.tplL,me.tplVarPrex+appendVar[1]+'='+me.tplVarPrex+appendVar[1]+'+"'+appendVar[2]+'"',me.tplR].join('');
					}else{
						return [me.tplL,'*'+appendVar[0]+'*',me.tplR].join('');
					}
				}else if(_if = /@(else if|if)[ ]?\((.*?)\)$/.exec($1)){

					var op = '',
						ifif = _if[1].replace(' ','') + ' ',
						sdm = _if[2].replace(/([a-zA-Z0-9_]+)\(([a-zA-Z0-9_.$]+)\)/g,function (match,$1,$2) {
							if($1 == "GetVar"){
								return me.tplVarPrex + $2;
							}else{
								return '"'+ $2 +'"|' + $1;
							}
						});
						sdm = sdm.replace(/=/g,'==').replace(/!/g,'!=').replace(/\|/g,'||').replace(/&/g,'&&');
						sdm = sdm.replace(/\$?[a-zA-Z0-9-_.]+\$?/g,function (match) {
							return '"'+match+'"';
						});
						
					return [me.tplL, ifif + sdm, me.tplR].join('');
				}else if(/@endif$/.exec($1)){
					return [me.tplL, '/if' , me.tplR].join('');
				}else if(/@else$/.exec($1)){
					return [me.tplL, 'else' , me.tplR].join('');
				}else{
					return match;//[me.tplL, $1 , me.tplR].join('');
				}
			});

			content = content.replace(/\$([a-zA-Z0-9_.]+)\$/g,function (match,$1) {
				return "$"+$1;
			});

			return content;
		},
		parseTemplate: function (content) {
			var me = this;
			var st = new Date().getTime();
			content = me.removeSectionString(content);
			content = me.handleIncluedFile(content);
			content = me.parseTemplateValue(content);
			content = me.encodeTemplate(content);
			var et = new Date().getTime();
			console.log('parseTemplate ok!',et-st,'ms');
			return content;
		}
	};

	if(!gTemplateTree){
		var st = new Date().getTime();
		util.createTemplateTree('./');
		var et = new Date().getTime();
		console.log('createTemplateTree ok!',et-st,'ms');
		//console.log(gTemplateTree);
	}

    return util.parseTemplate(fisContent);
};