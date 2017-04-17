var LibraryUIKit = {
    $UIKit__deps: [],
    $UIKit__postset: "UIKit.init();",
    $UIKit: {
        init: function() {
        }
    },

};

autoAddDeps(LibraryUIKit, '$UIKit');
mergeInto(LibraryManager.library, LibraryUIKit);
