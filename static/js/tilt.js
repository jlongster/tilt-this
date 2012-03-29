
TILE_DIMEN = [50, 50];
EDITOR_SIZE = [10, 10];

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
        var offset = editor.offset();
        var dimen = { width: editor.width(),
                      height: editor.height() };

        html2canvas.logging = true;
        var queue = html2canvas.Parse(editor[0]);
        var canvas = $(html2canvas.Renderer(queue, {elements: editor[0]}));
        canvas.css({
            position: 'absolute', 
            left: 0, 
            top: 0,
            zIndex: 1000
        }).appendTo(document.body);

        var ctx = canvas[0].getContext('2d');
        var data = ctx.getImageData(offset.left, offset.top,
                                    dimen.width, dimen.height);

        canvas[0].width = dimen.width;
        canvas[0].height = dimen.height;


        for(var i=0; i<data.width*data.height*4; i+=4) {
            var d = data.data;
            var a = d[i+3]/255;
            var c = [255, 255, 255];

            d[i] = d[i]*a + c[0]*(1-a);
            d[i+1] = d[i+1]*a + c[1]*(1-a);
            d[i+2] = d[i+2]*a + c[2]*(1-a);
            d[i+3] = 255;
        }

        ctx.putImageData(data, 0, 0);
        upload_screenshot(canvas[0].toDataURL());
        canvas.remove();
    }

    function upload_screenshot(url) {
        $.post('/screenshot', { james: 'hello world' });
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

    $('.tile').live('dragstart', function(e) {
        e.preventDefault();
    });

    $('.tile').live('mousedown', function(e) {
        var offset = editor.offset();
        e.stopImmediatePropagation();
        e.stopPropagation();

        dispatch($(this),
                 e.pageX - offset.left,
                 e.pageY - offset.top);
    });

    $('.tile').live('mouseup', function(e) {
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

    $('.tile-bottom').live('mousedown', function(e) {
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

    init();
});