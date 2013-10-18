fis.config.merge({
    namespace : 'wx_test',
    modules : {
        parser : {
            less : ['less'],
            html : ['qqmailtemplate']
        }
    },
    roadmap : {
        ext : {
            less : 'css',  //less文件编译后转为css文件
            html : 'php'
        },
        pack : {
            'pkg/aio.css' : [
                '**.css'
            ]
        },
        path:[
            {
                reg : '**.css',
                useSprite : true
            }
        ]
    },
    settings: {
        spriter: {
            csssprites: {
                margin: 10
            }
        }
    }
});