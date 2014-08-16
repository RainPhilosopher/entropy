{"version":3,"file":"build/entropy.min.js","sources":["./build/entropy.js"],"names":["e","exports","module","define","amd","f","window","global","self","Entropy","t","n","r","s","o","u","a","require","i","Error","call","length",1,"_dereq_","DoublyLinkedList","Node","__slice","slice","data","this","prev","next","head","tail","_current","prototype","append","node","prepend","join","list","console","warn","remove","thing","byData","nodeToRemove","_ref","_ref1","_ref2","_ref3","reset","pop","shift","begin","end","temp","current","iterate","args","binding","fn","arguments","apply","concat","clear",2,"OrderedLinkedList","priority","insert",3,"DEFAULT_CONFIG","USER_CONFIG","type","debug","max_components_count","key","value","of","string","../utils/type",4,"Engine","componetsPool","Component","obj","error","../debug/debug",5,"config","log","message","warning","../config/config",6,"Const","LinkedList","./collection/doublylinkedlist","./collection/orderedlinkedlist","./core/engine","./utils/const","./utils/polyfill",7,"toUpperCase","Object","defineProperty","./type",8,"lastTime","vendor","vendors","_i","_len","requestAnimationFrame","cancelAnimationFrame","callback","currTime","id","timeToCall","Date","getTime","Math","max","setTimeout","clearTimeout","nowOffset","performance","now","timing","navigationStart",9,"toString","undefined","null","number","boolean","function","array","date","regexp","object"],"mappings":"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"}