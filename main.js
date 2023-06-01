state =
  A: [4, 8, 10, 20, 5, 6, 13, 12, 25, 15, 14, 0, 26, 9, 3, 1, 19, 2, 24, 28, 17, 23, 27, 7, 11, 29, 21, 30, 22, 18, 16]

parent_index = (i) ->
  p = (i - 1) // 2
  return (if 0 < i then p else i)
left_index = (i, n) ->
  l = 2 * i + 1
  return (if l < n then l else i)
right_index = (i, n) ->
  r = 2 * i + 2
  return (if r < n then r else i)
index_depth = (i) ->
  if i == 0 then 0 else 1 + index_depth(parent_index(i))
index_height = (i, n) ->
  l = left_index(i,n)
  return (if l == i then 0 else 1 + index_height(l,n))

Act = (none:0,swap:1,set_n:2,set_mhd:3,set_mhu:4,clear_path:5)

swap_indices = (A, i, j) ->
  yield (act:Act.swap, i:i, j:j, msg:"Swap A[#{i}], A[#{j}]")
  [A[i],A[j]] = [A[j],A[i]]

max_heapify_down = (A, n, i, from) -> # O(log i)
  [l, r] = [left_index(i, n), right_index(i, n)] # O(1) indices
  c = (if A[r] < A[l] then l else r) # O(1) index of largest child
  to = (i:i,l:l,r:r,c:c)
  yield (act:Act.set_mhd, from:from, to:to, msg:"Max Heapifying Down from A[#{i}] = #{A[i]}")
  if A[i] < A[c]                     # O(1) compare
    yield from swap_indices(A,i,c)   # O(1) swap child
    yield from max_heapify_down(A, n, c, to) # O(log c) recursive call
  else
    yield (act:Act.set_mhd, from:to, to:null, msg:"")

max_heapify_up = (A, n, i, from) ->       # O(log n - log i)
  p = parent_index(i)               # O(1) index of parent (or i)
  to = (i:i,p:p)
  yield (act:Act.set_mhu, from:from, to:to, msg:"Max Heapifying Up from A[#{i}] = #{A[i]}")
  if A[p] < A[i]                    # O(1) compare
    yield from swap_indices(A,i,p)  # O(1) swap parent
    yield from max_heapify_up(A, n, p, null) # O(log n - log p) recursive call on parent
  else
    yield (act:Act.set_mhu, from:to, to:null, msg:"")

heap_insert = (A, n) -> # A[n] is new value
  if n < A.length
    new_n = n + 1
    yield (act:Act.set_n, from:n, to:new_n, msg:"Increase n: #{n} -> #{new_n}")
    yield from max_heapify_up(A, new_n, n, null)

heap_extract_max = (A, n) -> # max value to be put at A[n-1]
  if n > 0
    new_n = n - 1
    yield (act:Act.set_n, from:n, to:new_n, msg:"Decrease n: #{n} -> #{new_n}")
    yield from swap_indices(A,0,new_n)
    yield from max_heapify_down(A, new_n, 0, null)

build_heap = (A) ->
  n = A.length
  if n > 1
    yield (act:Act.set_n, from:0, to:n, msg:"Insert all #{n} elements")
    for i in [(n//2)-1 .. 0] # O(n) loop forward over array
      yield from max_heapify_down(A, n, i) # O(log n - log i)) fix max heap
      yield (act:Act.clear_path, msg:"")

heap_sort = (A) ->
  max_n = A.length
  if max_n > 1
    yield from build_heap(A) # O(n) build
    for n in [max_n ... 0] # O(n) loop backward over array
      yield from heap_extract_max(A,n) # O(log n) extract and fix
      yield (act:Act.clear_path, msg:"")

# find maximum width and height of all cells
biggest_bbox = (A) ->
  bbox = (width:0, height:0)
  for v in A
    vbox = v.bbox()
    bbox.width = Math.max(bbox.width, vbox.width)
    bbox.height = Math.max(bbox.height, vbox.height)
  return bbox

max = (A) -> return A.reduce((a,b) -> Math.max(a,b))
Color = net.brehaut.Color

init_draw = (draw, A) ->
  tree_height = index_depth(A.length-1)
  ######## flat array graphics ########
  array_group = draw.group()
  rect_group = array_group.group()
  num_group = array_group.group()
  level_group = array_group.group()
  # create text elements for numbers
  array_nums = (num_group.text("" + v) for v in A)
  # determine how big each cell of A should be
  bbox = biggest_bbox(array_nums)
  margin = 6
  bbox.width += margin
  bbox.height += margin
  # create rectangles for each cell
  array_rects = (rect_group.rect(bbox.width, bbox.height) for v in A)
  # compute colors
  red = Color(hue: 0, saturation: 1, value: 1)
  in_colors = (red.shiftHue(v*10).lightenByRatio(0.55).toCSS() for v in A)
  # position array elements
  for v,i in A
    color = in_colors[i] # out_color
    anum = array_nums[i]
    arect = array_rects[i]
    # place array cell
    ax = bbox.width * i
    ay = bbox.height
    arect.fill(color)
         .stroke('#fff')
         .move(ax, ay)
    anum.center(arect.cx(), arect.cy())
  # create level lines
  level_lines = []
  for d in [0 .. tree_height]
    ldx = Math.pow(2,d) * bbox.width
    lx = ldx - bbox.width
    ly = 2*bbox.height + 3
    line = level_group.line(lx+2,ly,lx+ldx-4,ly).stroke(color:'#000',width:2)
    level_lines.push(line)
  flat_height = 3 * bbox.height
  ######## staggered array graphics ########
  stag_top = flat_height
  stag_group = draw.group()
  stag_edge_group = stag_group.group()
  stag_num_group = stag_group.group().after(stag_edge_group)
  stag_rect_group = stag_group.group().before(stag_num_group)
  stag_nums = (null for v in A)
  for v,i in A
    g = stag_num_group.group()
    color = in_colors[i] # out_color
    tc = g.rect(bbox.width, bbox.height)
          .fill(color)
    tt = g.text("" + v).center(tc.cx(), tc.cy())
    stag_nums[i] = g
  stag_rects = (stag_rect_group.rect(bbox.width, bbox.height) for v in A)
  stag_edges = (null for v in A)
  for v,i in A
    color = in_colors[i] # out_color
    snum = stag_nums[i]
    srect = stag_rects[i]
    sx = bbox.width * i
    sy = stag_top + index_depth(i) * 1.75 * bbox.height
    srect.move(sx,sy).fill(opacity:0).stroke('#fff')
    snum.center(srect.cx(), srect.cy())
    if i > 0
      p = parent_index(i)
      prect = stag_rects[p]
      stag_edges[i] = stag_edge_group.line(srect.cx(), srect.cy(), prect.cx(), prect.cy()).stroke(color:'#888',width:1)#.hide()
  stag_height = (1 + 1.75 * index_depth(A.length-1)) * bbox.height
  ######## tree graphics ########
  tree_top = stag_top + stag_height + 8
  tree_group = draw.group()
  tree_edge_group = tree_group.group()
  tree_circle_group = tree_group.group()
  tree_num_group = tree_group.group()
  cbox = (width:(bbox.width*3)//2, height:(bbox.height*3)//2)
  tree_nums = (null for v in A)
  for v,i in A
    g = tree_num_group.group()
    color = in_colors[i] # out_color
    tc = g.circle(cbox.width, cbox.height)
          .fill(color)
    tt = g.text("" + v).center(tc.cx(), tc.cy())
    tree_nums[i] = g
  tree_circles = (tree_circle_group.circle(cbox.width, cbox.height) for v in A)
  tree_edges = (null for v in A)
  # position tree elements
  tree_levels = ([] for d in [0..tree_height])
  for i in [0...A.length]
    tree_levels[index_depth(i)].push(i)
  for level,d in tree_levels
    h = (tree_height - d + 1) #index_height(i, A.length)
    x_offset = Math.pow(2,h-2) * (8 + cbox.width)
    x_spacing = Math.pow(2,h-1) * (8 + cbox.width)
    for i,li in level
      tnum = tree_nums[i]
      tcirc = tree_circles[i]
      # place tree node
      tx = x_offset + li * x_spacing
      ty = tree_top + d * cbox.height
      tcirc.fill(opacity:0)
           .stroke(opacity:0)#('#fff')
           .move(tx,ty)
      tnum.center(tcirc.cx(), tcirc.cy())
      # place parent edge
      if i > 0
        p = parent_index(i)
        pcirc = tree_circles[p]
        tree_edges[i] = tree_edge_group.line(pcirc.cx(), pcirc.cy(), tcirc.cx(), tcirc.cy()).stroke('#888').hide()
  tree_bot = tree_top + (tree_height + 1) * cbox.height
  # create pointers
  ptrs = init_pointers(draw, bbox, cbox)
  # set the viewbox to be just the matrix
  spacing = 3
  view_height = tree_bot
  draw.viewbox(x:-4, y:-4, width: 8 + bbox.width * (1 + A.length), height: 8 + view_height)
  draw.size(12 + bbox.width * A.length, 12 + view_height)
  # return info
  return (
    bbox: bbox,
    cbox: cbox,
    ptrs: ptrs,
    in_colors: in_colors,
    tree_path: [],
    heap_size: 0,
    heap: ((
      value: A[i],
      cell:(num:array_nums[i], rect:array_rects[i]),
      stag:(num:stag_nums[i], rect:stag_rects[i], parent_edge:stag_edges[i]),
      node:(num:tree_nums[i], circle:tree_circles[i], parent_edge:tree_edges[i])
    ) for i in [0 ... A.length]))

init_pointers = (draw, bbox, cbox) ->
  # make ptrs into cells of array
  make_cell_ptr = (label, below = false) ->
    g = draw.group()
    r = g.rect(bbox.width, bbox.height)
         .fill(opacity:0)
         .stroke('#000')
         .move(0, bbox.height)
    toffset = bbox.height * (if below then 1 else -1)
    t = g.text(label).font(family:"Monospace",size:20)
         .center(r.cx(), r.cy() + toffset)
    g.hide()
    return g
  cell_ptrs = (i:make_cell_ptr("i"), r:make_cell_ptr("r"), l:make_cell_ptr("l"), p:make_cell_ptr("p"), n:make_cell_ptr("n",true))
  # make ptrs for staggered array
  make_stag_ptr = (label) ->
    r = draw.rect(bbox.width, bbox.height)
            .fill(opacity:0)
            .stroke(color:'#000',width:(if label == "i" then 4 else 2))
            .move(0, bbox.height)
    r.hide()
    return r
  stag_ptrs = (i:make_stag_ptr("i"), r:make_stag_ptr("r"), l:make_stag_ptr("l"), p:make_stag_ptr("p"), n:make_stag_ptr("n"))
  # make ptrs into nodes of tree
  make_node_ptr = (label) ->
    c = draw.circle(cbox.width, cbox.height)
            .fill(opacity:0)
            .stroke(color:'#000',width:(if label == "i" then 4 else 2))
    c.hide()
    return c
  node_ptrs = (i:make_node_ptr("i"), r:make_node_ptr("r"), l:make_node_ptr("l"), p:make_node_ptr("p"))
  return (cell:cell_ptrs, stag:stag_ptrs, node:node_ptrs)

dur_index = 0
durations = [
  (swap:1000, ptr:600, name:"1x Speed")
  (swap:500, ptr:300, name:"2x Speed"),
  (swap:200, ptr:50, name:"5x Speed"),
  (swap:50, ptr:10, name:"20x Speed")
]
window.toggle_turbo = () ->
  dur_index = (dur_index + 1) % durations.length
  document.getElementById("turbo-button").innerHTML = durations[dur_index].name

add_to_tree_path = (draw, info, i) ->
  info.tree_path.push(i)
  info.heap[i].node.circle.stroke(color:'#444', opacity:1, width:5)
clear_tree_path = (info) ->
  for i in info.tree_path
    info.heap[i].node.circle.stroke(opacity:0)
  info.tree_path = []

anim_or_appear = (obj, dur) ->
  if obj.visible()
    return obj.animate(dur)
  else
    return obj.show()

do_step = (draw, info, step) ->
  # define convenience functions
  put_ptr = (name) ->
    dur = durations[dur_index].ptr
    # flat array
    anim_or_appear(info.ptrs.cell[name], dur).x(step.to[name] * info.bbox.width)
    # staggered array
    if step.to[name] < info.heap.length
      elem = info.heap[step.to[name]].stag.rect
      anim_or_appear(info.ptrs.stag[name], dur).move(elem.x(), elem.y())
    # tree
    elem = info.heap[step.to[name]].node.circle
    anim_or_appear(info.ptrs.node[name], dur).move(elem.x(), elem.y())
  hide_ptr = (name) ->
    info.ptrs.cell[name].hide()
    info.ptrs.stag[name].hide()
    info.ptrs.node[name].hide()
  color_parent_edge = (p,i) ->
    if i != p
      ei = info.heap[i]
      ei.stag.parent_edge.stroke(color: '#888', width:1)
      if i < info.heap_size
        ep = info.heap[p]
        ei.node.parent_edge.show()
        if ei.value > ep.value # violates heap property
          ei.node.parent_edge.stroke(color: '#f00', width:4)
          ei.stag.parent_edge.stroke(color: '#f00', width:4)
        else # satisfies heap property
          ei.node.parent_edge.stroke(color: '#888', width:1)
      else
        ei.node.parent_edge.hide()
  color_edges = (i) ->
    [p,l,r] = [parent_index(i), left_index(i,info.heap_size), right_index(i,info.heap_size)]
    color_parent_edge(p,i)
    color_parent_edge(i,l)
    color_parent_edge(i,r)
  
  switch step.act
    when Act.none then true
    when Act.set_n
      info.heap_size = step.to
      anim_or_appear(info.ptrs.cell.n, durations[dur_index].ptr).x(step.to * info.bbox.width)
      if step.to > step.from # increase
        for i in [step.from ... step.to]
          color_edges(i)
      else # decrease
        for i in [step.to ... step.from]
          color_edges(i)
    when Act.set_mhd
      if step.to?
        put_ptr("i")
        add_to_tree_path(draw, info, step.to.i)
        if step.to.l == step.to.i
          hide_ptr("l")
          hide_ptr("r")
        else
          put_ptr("l")
          if step.to.r == step.to.i
            hide_ptr("r")
          else
            put_ptr("r")
      else
          hide_ptr("i")
          hide_ptr("l")
          hide_ptr("r")
    when Act.set_mhu # (i:i,p:p)
      if step.to?
        put_ptr("i")
        add_to_tree_path(draw, info, step.to.i)
        if step.to.p == step.to.i
          hide_ptr("p")
        else
          put_ptr("p")
      else
        hide_ptr("i")
        hide_ptr("p")
    when Act.swap
      ei = info.heap[step.i]
      ej = info.heap[step.j]
      dur = durations[dur_index].swap
      # swap in array
      ei.cell.num.animate(dur).center(ej.cell.rect.cx(), ej.cell.rect.cy())
      ej.cell.num.animate(dur).center(ei.cell.rect.cx(), ei.cell.rect.cy())
      ei.cell.rect.animate(dur).fill(info.in_colors[step.j])
      ej.cell.rect.animate(dur).fill(info.in_colors[step.i])
      # swap in staggered array
      ei.stag.num.animate(dur).center(ej.stag.rect.cx(), ej.stag.rect.cy())
      ej.stag.num.animate(dur).center(ei.stag.rect.cx(), ei.stag.rect.cy())
      # swap in tree
      ei.node.num.animate(dur).center(ej.node.circle.cx(), ej.node.circle.cy())
      ej.node.num.animate(dur).center(ei.node.circle.cx(), ei.node.circle.cy())
      ei.node.circle.animate(dur).fill(info.in_colors[step.j])
      ej.node.circle.animate(dur).fill(info.in_colors[step.i])
      # swap in info
      [ei.value, ej.value] = [ej.value, ei.value]
      [ei.cell.num, ej.cell.num] = [ej.cell.num, ei.cell.num]
      [ei.stag.num, ej.stag.num] = [ej.stag.num, ei.stag.num]
      [ei.node.num, ej.node.num] = [ej.node.num, ei.node.num]
      [info.in_colors[step.i], info.in_colors[step.j]] = [info.in_colors[step.j], info.in_colors[step.i]]
      color_edges(step.i)
      color_edges(step.j)
    when Act.clear_path
      clear_tree_path(info)
  true

# autorun controls
autorun = 0
autorun_dur = () -> Math.max(durations[dur_index].swap, durations[dur_index].ptr)
buttons_edit_playing = () ->
  document.getElementById("play-button").innerHTML = "Pause"
  document.getElementById("next-button").disabled = "true"
buttons_edit_stopped = () ->
  document.getElementById("play-button").innerHTML = "Play"
  document.getElementById("next-button").disabled = null
# start/stop play
window.click_play = () ->
  switch autorun
    when 0 # paused
      autorun = 1
      buttons_edit_playing()
      autorun_loop()
    when 1 # already playing
      autorun = 0
# loop
autorun_loop = () ->
  dur = autorun_dur()
  if autorun == 1 and window.click_next()
    buttons_edit_playing()
    state.draw.animate(duration:dur).after(() -> autorun_loop())
  else if autorun == 0
    buttons_edit_stopped()
  true

set_cmd_buttons_usable = (can_press) ->
  value = (if can_press then null else "true")
  document.getElementById("cmd-full-size").disabled = value
  document.getElementById("cmd-mhu").disabled = value
  document.getElementById("cmd-sort").disabled = value
  document.getElementById("cmd-build").disabled = value
  document.getElementById("cmd-rmv").disabled = value
  document.getElementById("cmd-ins").disabled = value

window.click_next = () ->
  if state.gen?
    next = state.gen.next()
    if next.done
      state.gen = null
      set_cmd_buttons_usable(true)
    else
      do_step(state.draw, state.info, next.value)
      document.getElementById("msg").innerHTML = next.value.msg
      set_cmd_buttons_usable(false)
    true
  else
    false

window.click_extract_max = () ->
  if state.gen?
    true # another operation is on-going
  else
    clear_tree_path(state.info)
    state.gen = heap_extract_max(state.A, state.info.heap_size)
    autorun = 1
    autorun_loop() #window.click_next()

window.click_insert = () ->
  if state.gen?
    true # another operation is on-going
  else
    clear_tree_path(state.info)
    state.gen = heap_insert(state.A, state.info.heap_size)
    autorun = 1
    autorun_loop() #window.click_next()

window.click_full_size = () ->
  if state.gen?
    true # another operation is on-going
  else
    generator = () -> yield (act:Act.set_n, from:state.info.heap_size, to:state.A.length, msg:"Making heap contain full array.")
    clear_tree_path(state.info)
    state.gen = generator()
    autorun = 1
    autorun_loop() #window.click_next()

window.click_max_heapify_down = () ->
  input = document.getElementById("trickle-index").value
  i = Math.abs(input)
  if "number" == typeof i and 0 <= i and i < state.info.heap_size
    if state.gen? # another operation is ongoing
      true
    else
      clear_tree_path(state.info)
      state.gen = max_heapify_down(state.A, state.info.heap_size, i, null)
      autorun = 1
      autorun_loop()

window.click_heap_sort = () ->
  if state.gen? # another operation is ongoing
    true
  else
    clear_tree_path(state.info)
    state.gen = heap_sort(state.A)
    autorun = 1
    autorun_loop()

window.click_build_heap = () ->
  if state.gen? # another operation is ongoing
    true
  else
    clear_tree_path(state.info)
    state.gen = build_heap(state.A)
    autorun = 1
    autorun_loop()

main = () ->
  state.draw = SVG('drawing')
  state.info = init_draw(state.draw, state.A)
  state.gen = null

SVG.on(document, 'DOMContentLoaded', main)