fis.config.merge({
    namespace : 'weinxi',
    modules : {
        parser : {
            less : ['less'],
            html : ['qqmailtemplate']
        }
    },
    roadmap : {
        ext : {
            less : 'css'  //less文件编译后转为css文件
        }
    }
});

fis.config.set('css_path','/htdocs/zh_CN/htmledition/style/');