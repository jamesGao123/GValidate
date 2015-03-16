var validate={
    //路由接口配置
    interfaceConfig:{},
    //过滤方法配置
    typeConfig:{},
    strOrNumVerify:function(target,reg){
        return typeof target==='number'?true:typeof target==='string'?reg.test(target.toString()):false;
    },
    numVerify:function(target,reg){
        return typeof target!=='number' ?false: reg.test(target.toString());
    },
    isNull:function(target){
        return target===null;
    },
    than:function(target,val){
        return this.canNumber(target)?parseFloat(target)>parseFloat(val):false;
    },
    less:function(target,val){
        return this.canNumber(target)?parseFloat(target)<parseFloat(val):false;
    },
    equal:function(target,val){
        return this.canNumber(target)?parseFloat(target)==parseFloat(val):false;
    },
    thanEqual:function(target,val){
        return this.canNumber(target)?parseFloat(target)>=parseFloat(val):false;
    },
    lessEqual:function(target,val){
        return this.canNumber(target)?parseFloat(target)<=parseFloat(val):false;
    },
    equalArray:function(target,val){
        return typeof target==='object' && target instanceof Array?target.length==parseInt(val):false;
    },
    canNumber:function(target){
        var reg=/^\d+(\.\d+)?$/;
        return validate.strOrNumVerify(target,reg);
    },
    canInt:function(target){
        var reg=/^\d+$/;
        return validate.strOrNumVerify(target,reg);
    },
    canFloat:function(target){
        var reg=/^\d+\.\d+$/;
        return validate.strOrNumVerify(target,reg);
    },
    canDate:function(target){
        return new Date(target).toString()!=='Invalid Date';
    },
    isInt:function(target){
        var reg=/^\d+$/;
        return validate.numVerify(target,reg);
    },
    isArray:function(target){
        return typeof target==='object' && target instanceof Array;
    },
    isFloat:function(target){
        var reg=/^\d+\.\d+$/;
        return validate.numVerify(target,reg);
    },
    isNumberOrString:function(target){
        return typeof target==='number' || typeof target==='string';
    },
    typeVerify:function(target,t){
        return typeof target===t;
    }
};
//验证配置项
var typeConfig = {
    isUndefined: 'undefined',
    isNumber: 'number',
    isString: 'string',
    isObject: 'object',
    isBoolean: 'boolean',
    isNull:validate.isNull,
    than:validate.than,
    less:validate.less,
    equal:validate.equal,
    thanEqual:validate.thanEqual,
    lessEqual:validate.lessEqual,
    equalArray:validate.equalArray,
    canNumber:validate.canNumber,
    canInt:validate.canInt,
    canFloat:validate.canFloat,
    canDate:validate.canDate,
    isNumberOrString: validate.isNumberOrString,
    isInt: validate.isInt,
    isFloat: validate.isFloat,
    isArray: validate.isArray
};
//验证管理
var validateManage={
    //初始化
    init:function(interfaceConfig){
        validate.typeConfig=typeConfig;
        if(typeof interfaceConfig!='object'){
            throw new Error('配置文件路径有误或配置文件格式有误，请重新载入');
        }
        validate.interfaceConfig=interfaceConfig;
    },
    //验证控制器 参数调用相应的验证方法
    verifyControl:function(vStr,target){
        // 过滤不存在的验证规则
        function filter(t){
            if(!t){
                throw new Error('不存在'+vStr+'验证规则');
            }
        }
        var arr=vStr.split('_');
        var cValue=arr[0];
        var isFalse=false;
        if(cValue[0]==='!'){
            cValue=cValue.substring(1);
            isFalse=true;
        }
        var value=validate.typeConfig[cValue];
        filter(value);
        var result;
        if(arr.length==2){  //取有_分割的验证 如then_0之类的
            result=this.getVerifyResult(value,target,arr[1]);
        }else{  //正常验证
            result=this.getVerifyResult(value,target);
        }
        return isFalse?!result:result;

    },
    // 每个参数的子模块验证
    getVerifyResult:function(t,target,vStr){
        if(typeof t==='string'){
            return validate.typeVerify(target,t);
        }else{
            var params=Array.prototype.slice.call(arguments,1);
            return t.apply(validate,params);
        }
    },
    //参数验证
    verify:function(str,target){
        var arr1=str.split('||');
        for(var i= 0;i<arr1.length;i++){
            var arr2=arr1[i].split('&&');
            var isTrue=true;
            for(var j=0;j<arr2.length;j++){
                if(!this.verifyControl(arr2[j].Trim(),target)){
                    isTrue=false;
                    break;
                }
            }
            if(isTrue){
                return true;
            }
        }
        return false;
    },
    //拆解参数
    //paramStr 配置文件中对应的参数名
    //target 传过来的json对象
    //require 验证条件
    disassemble:function(paramStr,target,require){
        var arr=paramStr.split('__');
        // 如果是数组 遍历数组
        if(typeof target==='object' && target instanceof Array){
            for(var i= 0;i<target.length;i++){
                if(!this.disassemble(paramStr,target[i],require)){
                    return false;
                }
            }
        }
        //如果是叶子节点
        else if(arr.length==1){
            return this.verify(require,target[paramStr]);
        }
        //如果是对象 就去下个值
        else if(typeof target==='object'){
            target=target[arr[0]];
            var str=arr.splice(1).join('__');
            return this.disassemble(str,target,require);
        }else{
            return false
        }
        return true;
    },
    //执行
    run:function(url,target,callback){
        try{
            url=url.split('/').splice(1).join('_');
            var interfaceConfigObj=validate.interfaceConfig[url];
            for(var k in interfaceConfigObj){
                var conf=interfaceConfigObj[k];
                var errorMessage=conf;
                //验证规则是数组
                if(typeof conf==='object' && conf instanceof Array){
                    if(conf.length===0){
                        throw new Error('配置文件中的接口:'+url+'的验证规则'+k+'不能为空数组');
                    }
                    if(conf.length===1){
                        conf=errorMessage=conf[0];
                    }else{
                        //带错误信息
                        errorMessage=conf[1];
                        conf=conf[0];
                    }
                }else if(typeof conf==='string'){
                    conf=conf.trim();
                    if(conf.length===0){
                        throw new Error('配置文件中的接口:'+url+'的验证规则'+k+'不能为空字符串');
                    }
                }else{
                    throw new Error('配置文件中的接口:'+url+'的验证规则'+k+'必须为字符串或数组');
                }
                if(!this.disassemble(k,target,conf)){
                    throw new Error(errorMessage);
                }
            }
            callback(null);
        }
        catch(err){
            callback(err);
        }
    }
};
module.exports= {
    init:function(){
        validateManage.init.apply(validateManage,arguments);
    },
    run:function(){
        validateManage.run.apply(validateManage,arguments)
    }
};
