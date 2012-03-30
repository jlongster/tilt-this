
TILE_DIMEN = [50, 50];
EDITOR_SIZE = [10, 10];

THUMB_WIDTH = 200;
THUMB_HEIGHT = 200;

$(document).ready(function() {

    var editor = $('#tilt-editor');
    var mode = 'add';
    var depths;

    function get_depth(x, y) {
        return depths[y][x];
    }

    function set_depth(x, y, d) {
        depths[y][x] = d;
    }

    function update_depths() {
        // Set the z-index on the whole stack to its depth
        $('.tile-bottom').each(function() {
            var el = $(this);
            var x = el.data('x');
            var y = el.data('y');
            el.css('z-index', get_depth(x, y));
        });
    }

    function save() {
        var html = editor.html();
        localStorage.tilt_html = html;
        localStorage.tilt_depths = JSON.stringify(depths);
    }

    function load() {
        if(localStorage.tilt_html) { 
            editor.html(localStorage.tilt_html);
            depths = JSON.parse(localStorage.tilt_depths);
            return true;
        }
        return false;
    }

    function clear() {
        localStorage.clear();
        editor.html('');
        init();
    }

    function publish() {
        $.post('/publish', { html: editor.html() });
    }

    function get_color(tag, depth) {
        var c;
        var step = .05;

        switch(tag) {
        case 'div': c = [86, 184, 189]; break;
        case 'p': c = [153, 153, 153]; break;
        default:
            throw 'invalid tag';
        }

        c = [c[0] - depth/step,
             c[1] - depth/step,
             c[2] - depth/step];

        return ('rgb(' +
                Math.round(c[0]) + ',' +
                Math.round(c[1]) + ',' +
                Math.round(c[2]) + ')');
    }

    function tool_add(el) {
        // We can't assume the top-most tile was clicked since ones
        // below it can be larger, 
        var top = el.find('.tile');
        if(top.length) {
            el = top.last();
        }

        var x = el.data('x');
        var y = el.data('y');
        var depth = get_depth(x, y);
        set_depth(x, y, depth+1);

        var tag = $('select[name=tile-type]').val();
        var tile = $('<' + tag + ' class="tile top" draggable="false"></' + tag + '>');
        tile.css({backgroundColor: get_color(tag, depth),
                  position: 'relative',
                  top: '0',
                  left: '0'});
        tile.data('x', x);
        tile.data('y', y);
        el.removeClass('top');
        el.append(tile);

        update_depths();
        save();
    }

    function tool_erase(el) {
        var x = el.data('x');
        var y = el.data('y');
        var depth = get_depth(x, y);

        if(depth > 1) {
            el.remove();
            set_depth(x, y, depth-1);
        }

        update_depths();
        save();
    }
    
    var drag_el = null;
    function tool_drag_start(el) {
        drag_el = el;
    }

    function tool_drag_stop() {
        drag_el = null;
        save();
    }

    function tool_resize(x, y) {
        if(drag_el) {
            var w = drag_el.width();
            var h = drag_el.height();

            if(w + x > 5 && h + y > 5) {
                drag_el.width(w + x);
                drag_el.height(h + y);
            }

            update_depths();
        }
    }

    function tool_move(x, y) {
        if(drag_el) {
            var top = parseInt(drag_el.css('top'));
            var left = parseInt(drag_el.css('left'));
            drag_el.css({top: top + y, left: left + x});
            
            update_depths();
        }
    }

    $('#tilt-editor .tile').live('dragstart', function(e) {
        e.preventDefault();
    });

    $('#tilt-editor .tile').live('mousedown', function(e) {
        var offset = editor.offset();
        e.stopImmediatePropagation();
        e.stopPropagation();

        dispatch($(this),
                 e.pageX - offset.left,
                 e.pageY - offset.top);
    });

    $('#tilt-editor .tile').live('mouseup', function(e) {
        tool_drag_stop();
    });

    var last_coord = null;
    $('#tilt-editor').mousemove(function(e) {
        if(!last_coord) {
            last_coord = [e.pageX, e.pageY];
        }
        else {
            var d = [e.pageX - last_coord[0],
                     e.pageY - last_coord[1]];
            switch(mode) {
            case 'resize':
                tool_resize(d[0], d[1]); break;
            case 'move':
                tool_move(d[0], d[1]); break;
            }
            last_coord = [e.pageX, e.pageY];
        }
    });

    $('#tilt-editor .tile-bottom').live('mousedown', function(e) {
        e.stopImmediatePropagation();
        dispatch($(this));
    });

    $('input[name=tool]').change(function(){ 
        switch(this.value) {
        case 'add': 
            mode = 'add'; break;
        case 'eraser': 
            mode = 'erase'; break;
        case 'resize':
            mode = 'resize'; break;
        case 'move':
            mode = 'move'; break;
        }
    });

    $('#tile-clear').click(clear);
    $('#tile-publish').click(publish);

    function dispatch(el, x, y) {
        switch(mode) {
        case 'add':
            tool_add(el, x, y); break;
        case 'erase':
            tool_erase(el); break;
        case 'resize':
        case 'move':
            tool_drag_start(el); break;
        }
    }

    function init() {
        if(!load()) {
            depths = [];
            for(var y=0; y<EDITOR_SIZE[1]; y++) {
                depths[y] = [];

                for(var x=0; x<EDITOR_SIZE[0]; x++) {
                    var stack = $('<div id="stack-' + x + '-' + y + '" ' +
                                  'class="tile-bottom x-' + x + ' y-' + y + '">' +
                                  '</div>');
                    var tile = $('<div class="tile top"></div>');
                    tile.data('x', x);
                    tile.data('y', y);
                    stack.data('x', x);
                    stack.data('y', y);
                    stack.css('position', 'relative');
                    stack.append(tile);
                    editor.append(stack);
                    depths[y][x] = 1;
                }

                editor.append('<div class="breaker"></div>');
            }
        }
    }

    $('.tilt-small').click(function() {
        var id = $(this).data('id');
        window.location.href = '/object/' + id;
    });

    init();
});