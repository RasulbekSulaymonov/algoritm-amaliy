(function() {
  var Act, Color, add_to_tree_path, anim_or_appear, autorun, autorun_dur, autorun_loop, biggest_bbox, build_heap, buttons_edit_playing, buttons_edit_stopped, clear_tree_path, do_step, dur_index, durations, heap_extract_max, heap_insert, heap_sort, index_depth, index_height, init_draw, init_pointers, left_index, main, max, max_heapify_down, max_heapify_up, parent_index, right_index, set_cmd_buttons_usable, state, swap_indices;

  state = {
    A: [ 16, 1, 2, 69, 12, 24, 3, 68, 59, 85, 45, 31, 48, 34, 81, 71, 97]
  };

  parent_index = function(i) {
    var p;
    p = Math.floor((i - 1) / 2);
    return (0 < i ? p : i);
  };

  left_index = function(i, n) {
    var l;
    l = 2 * i + 1;
    return (l < n ? l : i);
  };

  right_index = function(i, n) {
    var r;
    r = 2 * i + 2;
    return (r < n ? r : i);
  };

  index_depth = function(i) {
    if (i === 0) {
      return 0;
    } else {
      return 1 + index_depth(parent_index(i));
    }
  };

  index_height = function(i, n) {
    var l;
    l = left_index(i, n);
    return (l === i ? 0 : 1 + index_height(l, n));
  };

  Act = {
    none: 0,
    swap: 1,
    set_n: 2,
    set_mhd: 3,
    set_mhu: 4,
    clear_path: 5
  };

  swap_indices = function*(A, i, j) {
    yield ({
      act: Act.swap,
      i: i,
      j: j,
      msg: `Swap A[${i}], A[${j}]`
    });
    return [A[i], A[j]] = [A[j], A[i]];
  };

  max_heapify_down = function*(A, n, i, from) { // O(log i)
    var c, l, r, to;
    [l, r] = [
      left_index(i,
      n),
      right_index(i,
      n) // O(1) indices
    ];
    c = (A[r] < A[l] ? l : r); // O(1) index of largest child
    to = {
      i: i,
      l: l,
      r: r,
      c: c
    };
    yield ({
      act: Act.set_mhd,
      from: from,
      to: to,
      msg: `Max Heapifying Down from A[${i}] = ${A[i]}`
    });
    if (A[i] < A[c]) {
      yield* swap_indices(A, i, c); // O(1) swap child
      return (yield* max_heapify_down(A, n, c, to)); // O(log c) recursive call
    } else {
      return (yield {
        act: Act.set_mhd,
        from: to,
        to: null,
        msg: ""
      });
    }
  };

  max_heapify_up = function*(A, n, i, from) { // O(log n - log i)
    var p, to;
    p = parent_index(i); // O(1) index of parent (or i)
    to = {
      i: i,
      p: p
    };
    yield ({
      act: Act.set_mhu,
      from: from,
      to: to,
      msg: `Max Heapifying Up from A[${i}] = ${A[i]}`
    });
    if (A[p] < A[i]) {
      yield* swap_indices(A, i, p); // O(1) swap parent
      return (yield* max_heapify_up(A, n, p, null)); // O(log n - log p) recursive call on parent
    } else {
      return (yield {
        act: Act.set_mhu,
        from: to,
        to: null,
        msg: ""
      });
    }
  };

  heap_insert = function*(A, n) { // A[n] is new value
    var new_n;
    if (n < A.length) {
      new_n = n + 1;
      yield ({
        act: Act.set_n,
        from: n,
        to: new_n,
        msg: `Increase n: ${n} -> ${new_n}`
      });
      return (yield* max_heapify_up(A, new_n, n, null));
    }
  };

  heap_extract_max = function*(A, n) { // max value to be put at A[n-1]
    var new_n;
    if (n > 0) {
      new_n = n - 1;
      yield ({
        act: Act.set_n,
        from: n,
        to: new_n,
        msg: `Decrease n: ${n} -> ${new_n}`
      });
      yield* swap_indices(A, 0, new_n);
      return (yield* max_heapify_down(A, new_n, 0, null));
    }
  };

  build_heap = function*(A) {
    var i, k, n, ref, results;
    n = A.length;
    if (n > 1) {
      yield ({
        act: Act.set_n,
        from: 0,
        to: n,
        msg: `Insert all ${n} elements`
      });
// O(n) loop forward over array
      results = [];
      for (i = k = ref = (Math.floor(n / 2)) - 1; (ref <= 0 ? k <= 0 : k >= 0); i = ref <= 0 ? ++k : --k) {
        yield* max_heapify_down(A, n, i); // O(log n - log i)) fix max heap
        results.push((yield {
          act: Act.clear_path,
          msg: ""
        }));
      }
      return results;
    }
  };

  heap_sort = function*(A) {
    var k, max_n, n, ref, results;
    max_n = A.length;
    if (max_n > 1) {
      yield* build_heap(A); // O(n) build
// O(n) loop backward over array
      results = [];
      for (n = k = ref = max_n; (ref <= 0 ? k < 0 : k > 0); n = ref <= 0 ? ++k : --k) {
        yield* heap_extract_max(A, n); // O(log n) extract and fix
        results.push((yield {
          act: Act.clear_path,
          msg: ""
        }));
      }
      return results;
    }
  };

  // find maximum width and height of all cells
  biggest_bbox = function(A) {
    var bbox, k, len, v, vbox;
    bbox = {
      width: 0,
      height: 0
    };
    for (k = 0, len = A.length; k < len; k++) {
      v = A[k];
      vbox = v.bbox();
      bbox.width = Math.max(bbox.width, vbox.width);
      bbox.height = Math.max(bbox.height, vbox.height);
    }
    return bbox;
  };

  max = function(A) {
    return A.reduce(function(a, b) {
      return Math.max(a, b);
    });
  };

  Color = net.brehaut.Color;

  init_draw = function(draw, A) {
    var anum, arect, array_group, array_nums, array_rects, ax, ay, bbox, cbox, color, d, flat_height, g, h, i, in_colors, k, ldx, len, len1, len2, len3, len4, len5, level, level_group, level_lines, li, line, lx, ly, m, margin, num_group, o, p, pcirc, prect, ptrs, q, rect_group, red, ref, ref1, s, snum, spacing, srect, stag_edge_group, stag_edges, stag_group, stag_height, stag_num_group, stag_nums, stag_rect_group, stag_rects, stag_top, sx, sy, tc, tcirc, tnum, tree_bot, tree_circle_group, tree_circles, tree_edge_group, tree_edges, tree_group, tree_height, tree_levels, tree_num_group, tree_nums, tree_top, tt, tx, ty, u, v, view_height, w, x, x_offset, x_spacing;
    tree_height = index_depth(A.length - 1);
    //####### flat array graphics ########
    array_group = draw.group();
    rect_group = array_group.group();
    num_group = array_group.group();
    level_group = array_group.group();
    // create text elements for numbers
    array_nums = (function() {
      var k, len, results;
      results = [];
      for (k = 0, len = A.length; k < len; k++) {
        v = A[k];
        results.push(num_group.text("" + v));
      }
      return results;
    })();
    // determine how big each cell of A should be
    bbox = biggest_bbox(array_nums);
    margin = 6;
    bbox.width += margin;
    bbox.height += margin;
    // create rectangles for each cell
    array_rects = (function() {
      var k, len, results;
      results = [];
      for (k = 0, len = A.length; k < len; k++) {
        v = A[k];
        results.push(rect_group.rect(bbox.width, bbox.height));
      }
      return results;
    })();
    // compute colors
    red = Color({
      hue: 0,
      saturation: 1,
      value: 1
    });
    in_colors = (function() {
      var k, len, results;
      results = [];
      for (k = 0, len = A.length; k < len; k++) {
        v = A[k];
        results.push(red.shiftHue(v * 10).lightenByRatio(0.55).toCSS());
      }
      return results;
    })();
// position array elements
    for (i = k = 0, len = A.length; k < len; i = ++k) {
      v = A[i];
      color = in_colors[i];
      anum = array_nums[i];
      arect = array_rects[i];
      // place array cell
      ax = bbox.width * i;
      ay = bbox.height;
      arect.fill(color).stroke('#fff').move(ax, ay);
      anum.center(arect.cx(), arect.cy());
    }
    // create level lines
    level_lines = [];
    for (d = m = 0, ref = tree_height; (0 <= ref ? m <= ref : m >= ref); d = 0 <= ref ? ++m : --m) {
      ldx = Math.pow(2, d) * bbox.width;
      lx = ldx - bbox.width;
      ly = 2 * bbox.height + 3;
      line = level_group.line(lx + 2, ly, lx + ldx - 4, ly).stroke({
        color: '#000',
        width: 2
      });
      level_lines.push(line);
    }
    flat_height = 3 * bbox.height;
    //####### staggered array graphics ########
    stag_top = flat_height;
    stag_group = draw.group();
    stag_edge_group = stag_group.group();
    stag_num_group = stag_group.group().after(stag_edge_group);
    stag_rect_group = stag_group.group().before(stag_num_group);
    stag_nums = (function() {
      var len1, o, results;
      results = [];
      for (o = 0, len1 = A.length; o < len1; o++) {
        v = A[o];
        results.push(null);
      }
      return results;
    })();
    for (i = o = 0, len1 = A.length; o < len1; i = ++o) {
      v = A[i];
      g = stag_num_group.group();
      color = in_colors[i];
      tc = g.rect(bbox.width, bbox.height).fill(color);
      tt = g.text("" + v).center(tc.cx(), tc.cy());
      stag_nums[i] = g;
    }
    stag_rects = (function() {
      var len2, q, results;
      results = [];
      for (q = 0, len2 = A.length; q < len2; q++) {
        v = A[q];
        results.push(stag_rect_group.rect(bbox.width, bbox.height));
      }
      return results;
    })();
    stag_edges = (function() {
      var len2, q, results;
      results = [];
      for (q = 0, len2 = A.length; q < len2; q++) {
        v = A[q];
        results.push(null);
      }
      return results;
    })();
    for (i = q = 0, len2 = A.length; q < len2; i = ++q) {
      v = A[i];
      color = in_colors[i];
      snum = stag_nums[i];
      srect = stag_rects[i];
      sx = bbox.width * i;
      sy = stag_top + index_depth(i) * 1.75 * bbox.height;
      srect.move(sx, sy).fill({
        opacity: 0
      }).stroke('#fff');
      snum.center(srect.cx(), srect.cy());
      if (i > 0) {
        p = parent_index(i);
        prect = stag_rects[p];
        stag_edges[i] = stag_edge_group.line(srect.cx(), srect.cy(), prect.cx(), prect.cy()).stroke({
          color: '#888',
          width: 1 //.hide()
        });
      }
    }
    stag_height = (1 + 1.75 * index_depth(A.length - 1)) * bbox.height;
    //####### tree graphics ########
    tree_top = stag_top + stag_height + 8;
    tree_group = draw.group();
    tree_edge_group = tree_group.group();
    tree_circle_group = tree_group.group();
    tree_num_group = tree_group.group();
    cbox = {
      width: Math.floor((bbox.width * 3) / 2),
      height: Math.floor((bbox.height * 3) / 2)
    };
    tree_nums = (function() {
      var len3, results, s;
      results = [];
      for (s = 0, len3 = A.length; s < len3; s++) {
        v = A[s];
        results.push(null);
      }
      return results;
    })();
    for (i = s = 0, len3 = A.length; s < len3; i = ++s) {
      v = A[i];
      g = tree_num_group.group();
      color = in_colors[i];
      tc = g.circle(cbox.width, cbox.height).fill(color);
      tt = g.text("" + v).center(tc.cx(), tc.cy());
      tree_nums[i] = g;
    }
    tree_circles = (function() {
      var len4, results, u;
      results = [];
      for (u = 0, len4 = A.length; u < len4; u++) {
        v = A[u];
        results.push(tree_circle_group.circle(cbox.width, cbox.height));
      }
      return results;
    })();
    tree_edges = (function() {
      var len4, results, u;
      results = [];
      for (u = 0, len4 = A.length; u < len4; u++) {
        v = A[u];
        results.push(null);
      }
      return results;
    })();
    // position tree elements
    tree_levels = (function() {
      var ref1, results, u;
      results = [];
      for (d = u = 0, ref1 = tree_height; (0 <= ref1 ? u <= ref1 : u >= ref1); d = 0 <= ref1 ? ++u : --u) {
        results.push([]);
      }
      return results;
    })();
    for (i = u = 0, ref1 = A.length; (0 <= ref1 ? u < ref1 : u > ref1); i = 0 <= ref1 ? ++u : --u) {
      tree_levels[index_depth(i)].push(i);
    }
    for (d = w = 0, len4 = tree_levels.length; w < len4; d = ++w) {
      level = tree_levels[d];
      h = tree_height - d + 1; //index_height(i, A.length)
      x_offset = Math.pow(2, h - 2) * (8 + cbox.width);
      x_spacing = Math.pow(2, h - 1) * (8 + cbox.width);
      for (li = x = 0, len5 = level.length; x < len5; li = ++x) {
        i = level[li];
        tnum = tree_nums[i];
        tcirc = tree_circles[i];
        // place tree node
        tx = x_offset + li * x_spacing;
        ty = tree_top + d * cbox.height;
        tcirc.fill({
          opacity: 0
        }).stroke({
          opacity: 0 //('#fff')
        }).move(tx, ty);
        tnum.center(tcirc.cx(), tcirc.cy());
        // place parent edge
        if (i > 0) {
          p = parent_index(i);
          pcirc = tree_circles[p];
          tree_edges[i] = tree_edge_group.line(pcirc.cx(), pcirc.cy(), tcirc.cx(), tcirc.cy()).stroke('#888').hide();
        }
      }
    }
    tree_bot = tree_top + (tree_height + 1) * cbox.height;
    // create pointers
    ptrs = init_pointers(draw, bbox, cbox);
    // set the viewbox to be just the matrix
    spacing = 3;
    view_height = tree_bot;
    draw.viewbox({
      x: -4,
      y: -4,
      width: 8 + bbox.width * (1 + A.length),
      height: 8 + view_height
    });
    draw.size(12 + bbox.width * A.length, 12 + view_height);
    return {
      // return info
      bbox: bbox,
      cbox: cbox,
      ptrs: ptrs,
      in_colors: in_colors,
      tree_path: [],
      heap_size: 0,
      heap: (function() {
        var ref2, results, y;
        results = [];
        for (i = y = 0, ref2 = A.length; (0 <= ref2 ? y < ref2 : y > ref2); i = 0 <= ref2 ? ++y : --y) {
          results.push({
            value: A[i],
            cell: {
              num: array_nums[i],
              rect: array_rects[i]
            },
            stag: {
              num: stag_nums[i],
              rect: stag_rects[i],
              parent_edge: stag_edges[i]
            },
            node: {
              num: tree_nums[i],
              circle: tree_circles[i],
              parent_edge: tree_edges[i]
            }
          });
        }
        return results;
      })()
    };
  };

  init_pointers = function(draw, bbox, cbox) {
    var cell_ptrs, make_cell_ptr, make_node_ptr, make_stag_ptr, node_ptrs, stag_ptrs;
    // make ptrs into cells of array
    make_cell_ptr = function(label, below = false) {
      var g, r, t, toffset;
      g = draw.group();
      r = g.rect(bbox.width, bbox.height).fill({
        opacity: 0
      }).stroke('#000').move(0, bbox.height);
      toffset = bbox.height * (below ? 1 : -1);
      t = g.text(label).font({
        family: "Monospace",
        size: 20
      }).center(r.cx(), r.cy() + toffset);
      g.hide();
      return g;
    };
    cell_ptrs = {
      i: make_cell_ptr("i"),
      r: make_cell_ptr("r"),
      l: make_cell_ptr("l"),
      p: make_cell_ptr("p"),
      n: make_cell_ptr("n", true)
    };
    // make ptrs for staggered array
    make_stag_ptr = function(label) {
      var r;
      r = draw.rect(bbox.width, bbox.height).fill({
        opacity: 0
      }).stroke({
        color: '#000',
        width: (label === "i" ? 4 : 2)
      }).move(0, bbox.height);
      r.hide();
      return r;
    };
    stag_ptrs = {
      i: make_stag_ptr("i"),
      r: make_stag_ptr("r"),
      l: make_stag_ptr("l"),
      p: make_stag_ptr("p"),
      n: make_stag_ptr("n")
    };
    // make ptrs into nodes of tree
    make_node_ptr = function(label) {
      var c;
      c = draw.circle(cbox.width, cbox.height).fill({
        opacity: 0
      }).stroke({
        color: '#000',
        width: (label === "i" ? 4 : 2)
      });
      c.hide();
      return c;
    };
    node_ptrs = {
      i: make_node_ptr("i"),
      r: make_node_ptr("r"),
      l: make_node_ptr("l"),
      p: make_node_ptr("p")
    };
    return {
      cell: cell_ptrs,
      stag: stag_ptrs,
      node: node_ptrs
    };
  };

  dur_index = 0;

  durations = [
    {
      swap: 1000,
      ptr: 600,
      name: "1x Speed"
    },
    {
      swap: 500,
      ptr: 300,
      name: "2x Speed"
    },
    {
      swap: 200,
      ptr: 50,
      name: "5x Speed"
    },
    {
      swap: 50,
      ptr: 10,
      name: "20x Speed"
    }
  ];

  window.toggle_turbo = function() {
    dur_index = (dur_index + 1) % durations.length;
    return document.getElementById("turbo-button").innerHTML = durations[dur_index].name;
  };

  add_to_tree_path = function(draw, info, i) {
    info.tree_path.push(i);
    return info.heap[i].node.circle.stroke({
      color: '#444',
      opacity: 1,
      width: 5
    });
  };

  clear_tree_path = function(info) {
    var i, k, len, ref;
    ref = info.tree_path;
    for (k = 0, len = ref.length; k < len; k++) {
      i = ref[k];
      info.heap[i].node.circle.stroke({
        opacity: 0
      });
    }
    return info.tree_path = [];
  };

  anim_or_appear = function(obj, dur) {
    if (obj.visible()) {
      return obj.animate(dur);
    } else {
      return obj.show();
    }
  };

  do_step = function(draw, info, step) {
    var color_edges, color_parent_edge, dur, ei, ej, hide_ptr, i, k, m, put_ptr, ref, ref1, ref2, ref3;
    // define convenience functions
    put_ptr = function(name) {
      var dur, elem;
      dur = durations[dur_index].ptr;
      // flat array
      anim_or_appear(info.ptrs.cell[name], dur).x(step.to[name] * info.bbox.width);
      // staggered array
      if (step.to[name] < info.heap.length) {
        elem = info.heap[step.to[name]].stag.rect;
        anim_or_appear(info.ptrs.stag[name], dur).move(elem.x(), elem.y());
      }
      // tree
      elem = info.heap[step.to[name]].node.circle;
      return anim_or_appear(info.ptrs.node[name], dur).move(elem.x(), elem.y());
    };
    hide_ptr = function(name) {
      info.ptrs.cell[name].hide();
      info.ptrs.stag[name].hide();
      return info.ptrs.node[name].hide();
    };
    color_parent_edge = function(p, i) {
      var ei, ep;
      if (i !== p) {
        ei = info.heap[i];
        ei.stag.parent_edge.stroke({
          color: '#888',
          width: 1
        });
        if (i < info.heap_size) {
          ep = info.heap[p];
          ei.node.parent_edge.show();
          if (ei.value > ep.value) { // violates heap property
            ei.node.parent_edge.stroke({
              color: '#f00',
              width: 4
            });
            return ei.stag.parent_edge.stroke({
              color: '#f00',
              width: 4 // satisfies heap property
            });
          } else {
            return ei.node.parent_edge.stroke({
              color: '#888',
              width: 1
            });
          }
        } else {
          return ei.node.parent_edge.hide();
        }
      }
    };
    color_edges = function(i) {
      var l, p, r;
      [p, l, r] = [parent_index(i), left_index(i, info.heap_size), right_index(i, info.heap_size)];
      color_parent_edge(p, i);
      color_parent_edge(i, l);
      return color_parent_edge(i, r);
    };
    switch (step.act) {
      case Act.none:
        true;
        break;
      case Act.set_n:
        info.heap_size = step.to;
        anim_or_appear(info.ptrs.cell.n, durations[dur_index].ptr).x(step.to * info.bbox.width);
        if (step.to > step.from) { // increase
          for (i = k = ref = step.from, ref1 = step.to; (ref <= ref1 ? k < ref1 : k > ref1); i = ref <= ref1 ? ++k : --k) {
            color_edges(i); // decrease
          }
        } else {
          for (i = m = ref2 = step.to, ref3 = step.from; (ref2 <= ref3 ? m < ref3 : m > ref3); i = ref2 <= ref3 ? ++m : --m) {
            color_edges(i);
          }
        }
        break;
      case Act.set_mhd:
        if (step.to != null) {
          put_ptr("i");
          add_to_tree_path(draw, info, step.to.i);
          if (step.to.l === step.to.i) {
            hide_ptr("l");
            hide_ptr("r");
          } else {
            put_ptr("l");
            if (step.to.r === step.to.i) {
              hide_ptr("r");
            } else {
              put_ptr("r");
            }
          }
        } else {
          hide_ptr("i");
          hide_ptr("l");
          hide_ptr("r");
        }
        break;
      case Act.set_mhu: // (i:i,p:p)
        if (step.to != null) {
          put_ptr("i");
          add_to_tree_path(draw, info, step.to.i);
          if (step.to.p === step.to.i) {
            hide_ptr("p");
          } else {
            put_ptr("p");
          }
        } else {
          hide_ptr("i");
          hide_ptr("p");
        }
        break;
      case Act.swap:
        ei = info.heap[step.i];
        ej = info.heap[step.j];
        dur = durations[dur_index].swap;
        // swap in array
        ei.cell.num.animate(dur).center(ej.cell.rect.cx(), ej.cell.rect.cy());
        ej.cell.num.animate(dur).center(ei.cell.rect.cx(), ei.cell.rect.cy());
        ei.cell.rect.animate(dur).fill(info.in_colors[step.j]);
        ej.cell.rect.animate(dur).fill(info.in_colors[step.i]);
        // swap in staggered array
        ei.stag.num.animate(dur).center(ej.stag.rect.cx(), ej.stag.rect.cy());
        ej.stag.num.animate(dur).center(ei.stag.rect.cx(), ei.stag.rect.cy());
        // swap in tree
        ei.node.num.animate(dur).center(ej.node.circle.cx(), ej.node.circle.cy());
        ej.node.num.animate(dur).center(ei.node.circle.cx(), ei.node.circle.cy());
        ei.node.circle.animate(dur).fill(info.in_colors[step.j]);
        ej.node.circle.animate(dur).fill(info.in_colors[step.i]);
        // swap in info
        [ei.value, ej.value] = [ej.value, ei.value];
        [ei.cell.num, ej.cell.num] = [ej.cell.num, ei.cell.num];
        [ei.stag.num, ej.stag.num] = [ej.stag.num, ei.stag.num];
        [ei.node.num, ej.node.num] = [ej.node.num, ei.node.num];
        [info.in_colors[step.i], info.in_colors[step.j]] = [info.in_colors[step.j], info.in_colors[step.i]];
        color_edges(step.i);
        color_edges(step.j);
        break;
      case Act.clear_path:
        clear_tree_path(info);
    }
    return true;
  };

  // autorun controls
  autorun = 0;

  autorun_dur = function() {
    return Math.max(durations[dur_index].swap, durations[dur_index].ptr);
  };

  buttons_edit_playing = function() {
    document.getElementById("play-button").innerHTML = "Pause";
    return document.getElementById("next-button").disabled = "true";
  };

  buttons_edit_stopped = function() {
    document.getElementById("play-button").innerHTML = "Play";
    return document.getElementById("next-button").disabled = null;
  };

  // start/stop play
  window.click_play = function() {
    switch (autorun) {
      case 0: // paused
        autorun = 1;
        buttons_edit_playing();
        return autorun_loop();
      case 1: // already playing
        return autorun = 0;
    }
  };

  // loop
  autorun_loop = function() {
    var dur;
    dur = autorun_dur();
    if (autorun === 1 && window.click_next()) {
      buttons_edit_playing();
      state.draw.animate({
        duration: dur
      }).after(function() {
        return autorun_loop();
      });
    } else if (autorun === 0) {
      buttons_edit_stopped();
    }
    return true;
  };

  set_cmd_buttons_usable = function(can_press) {
    var value;
    value = (can_press ? null : "true");
    document.getElementById("cmd-full-size").disabled = value;
    document.getElementById("cmd-mhu").disabled = value;
    document.getElementById("cmd-sort").disabled = value;
    document.getElementById("cmd-build").disabled = value;
    document.getElementById("cmd-rmv").disabled = value;
    return document.getElementById("cmd-ins").disabled = value;
  };

  window.click_next = function() {
    var next;
    if (state.gen != null) {
      next = state.gen.next();
      if (next.done) {
        state.gen = null;
        set_cmd_buttons_usable(true);
      } else {
        do_step(state.draw, state.info, next.value);
        document.getElementById("msg").innerHTML = next.value.msg;
        set_cmd_buttons_usable(false);
      }
      return true;
    } else {
      return false;
    }
  };

  window.click_extract_max = function() {
    if (state.gen != null) {
      return true; // another operation is on-going
    } else {
      clear_tree_path(state.info);
      state.gen = heap_extract_max(state.A, state.info.heap_size);
      autorun = 1;
      return autorun_loop(); //window.click_next()
    }
  };

  window.click_insert = function() {
    if (state.gen != null) {
      return true; // another operation is on-going
    } else {
      clear_tree_path(state.info);
      state.gen = heap_insert(state.A, state.info.heap_size);
      autorun = 1;
      return autorun_loop(); //window.click_next()
    }
  };

  window.click_full_size = function() {
    var generator;
    if (state.gen != null) {
      return true; // another operation is on-going
    } else {
      generator = function*() {
        return (yield {
          act: Act.set_n,
          from: state.info.heap_size,
          to: state.A.length,
          msg: "Making heap contain full array."
        });
      };
      clear_tree_path(state.info);
      state.gen = generator();
      autorun = 1;
      return autorun_loop(); //window.click_next()
    }
  };

  window.click_max_heapify_down = function() {
    var i, input;
    input = document.getElementById("trickle-index").value;
    i = Math.abs(input);
    if ("number" === typeof i && 0 <= i && i < state.info.heap_size) {
      if (state.gen != null) {
        return true;
      } else {
        clear_tree_path(state.info);
        state.gen = max_heapify_down(state.A, state.info.heap_size, i, null);
        autorun = 1;
        return autorun_loop(); // another operation is ongoing
      }
    }
  };

  window.click_heap_sort = function() {
    if (state.gen != null) {
      return true;
    } else {
      clear_tree_path(state.info);
      state.gen = heap_sort(state.A);
      autorun = 1;
      return autorun_loop(); // another operation is ongoing
    }
  };

  window.click_build_heap = function() {
    if (state.gen != null) {
      return true;
    } else {
      clear_tree_path(state.info);
      state.gen = build_heap(state.A);
      autorun = 1;
      return autorun_loop(); // another operation is ongoing
    }
  };

  main = function() {
    state.draw = SVG('drawing');
    state.info = init_draw(state.draw, state.A);
    return state.gen = null;
  };

  SVG.on(document, 'DOMContentLoaded', main);

}).call(this);