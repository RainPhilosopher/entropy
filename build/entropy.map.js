{"version":3,"file":"entropy.min.js","sources":["entropy.js"],"names":["e","exports","module","define","amd","f","window","global","self","Entropy","t","n","r","s","o","u","a","require","i","Error","code","l","call","length",1,"DoublyLinkedList","Node","__slice","slice","data","this","prev","next","head","tail","_current","prototype","append","node","prepend","join","list","console","warn","remove","thing","byData","nodeToRemove","_ref","_ref1","_ref2","_ref3","reset","pop","shift","begin","end","temp","current","iterate","args","binding","fn","arguments","apply","concat","clear",2,"OrderedLinkedList","priority","insert",3,"DEFAULT_CONFIG","USER_CONFIG","type","debug","max_components_count","max_frame_time","default_time_factor","default_fps","key","value","of","string","../utils/type",4,"Engine","EventEmitter","__hasProp","hasOwnProperty","__extends","child","parent","ctor","constructor","__super__","_super","componetsPool","Component","obj","object","error","../debug/debug","./event",5,"events","on","event","once","_base","push","emit","filter","listener","trigger","off",6,"ARGS","BINDING","FN","Game","State","Ticker","initialState","ticker","state","change","register","start","pause","resume","stop","engine","_this","./state","./ticker",7,"states","game","currentState","doTransition","enterState","exitState","initializeState","queue","setCurrentState","setInitialized","shifting","transitions","queueHead","done","_initialized","initialize","onEnter","onExit","nextState","to","transitionFnName","name","isIn",8,"config","raf","requestAnimationFrame","FPS","MAX_FRAME_TIME","TIME_FACTOR","_paused","_running","_ticks","_lastTime","_currentFPS","_rafId","setFPS","fps","getCurrentFPS","Math","round","setTimeFactor","factor","getTicks","_tick","bind","cancelAnimationFrame","toggle","isPaused","isRunning","time","delta","performance","now","tick","paused","../config/config",9,"log","message","warning",10,"Const","LinkedList","./collection/doublylinkedlist","./collection/orderedlinkedlist","./core/engine","./core/game","./core/ticker","./debug/debug","./utils/const","./utils/polyfill",11,"toUpperCase","Object","defineProperty","./type",12,"lastTime","vendor","vendors","_i","_len","callback","currTime","id","timeToCall","Date","getTime","max","setTimeout","clearTimeout","nowOffset","timing","navigationStart",13,"toString","undefined","null","number","boolean","function","array","date","regexp"],"mappings":"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"}