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

fis.config.set('MMCONF',{
    templateTreeRoot:'./',
    templateExtnames:['.html'],
    noTemplateFolder:['htdocs','images','style','css','.svn'],
    leftDelimiter:"{%",
    rightDelimiter:"%}"
});