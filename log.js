exports.log = function() {
    var time = '\n' + new Date().toLocaleString() + ' : ';

    if (arguments.length <= 0) {
        console.log('');
    } else if (arguments.length > 0) {

        for (var i = 0; i < arguments.length; i++) {
            if (typeof arguments[i] === 'string') {
                console.log(time + arguments[i]);
                time = '';
            } else {
                if (time != ''){
                    console.log(time, arguments[i]);
                    time = '';
                }
                else{
                    console.log(arguments[i]);
                }
                
            }
        }
    }

};

exports.warn = function() {
    var time = '\n' + new Date().toLocaleString() + ' : ';

    if (arguments.length <= 0) {
        console.warn('');
    } else if (arguments.length > 0) {

        for (var i = 0; i < arguments.length; i++) {
            if (typeof arguments[i] === 'string') {
                console.warn(time + '\x1b[93m' + arguments[i] + '\x1b[0m');
                time = '';
            } else {
                if (time != ''){
                    console.warn(time, arguments[i]);
                    time = '';
                }
                else{
                    console.warn(arguments[i]);
                }
                
            }
        }
    }

};

exports.err = function() {
    var time = '\n' + new Date().toLocaleString() + ' : ';

    if (arguments.length <= 0) {
        console.error('');
    } else if (arguments.length > 0) {

        for (var i = 0; i < arguments.length; i++) {
            if (typeof arguments[i] === 'string') {
                console.error(time + '\x1b[35m' + arguments[i] + '\x1b[0m');
                time = '';
            } else {
                if (time != ''){
                    console.error(time, arguments[i]);
                    time = '';
                }
                else{
                    console.error(arguments[i]);
                }
                
            }
        }
    }

};
