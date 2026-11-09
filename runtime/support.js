/*
 * Motor de la landing Black Days · Akira Travel
 * ------------------------------------------------------------
 * Interpreta el archivo del lienzo de Claude (src/Main.dc.html) en cualquier
 * navegador, para que la versión publicada sea el MISMO archivo que se edita
 * en el Artifact. No contiene diseño ni contenido: solo sabe leer el formato.
 *
 * Formato soportado (el que usa el lienzo):
 *   <helmet> ... </helmet>            → se copia al <head> (fuentes, estilos)
 *   {{ruta.al.valor}}                 → valores calculados por renderVals()
 *   <sc-for list="{{lista}}" as="x">  → repetir por cada elemento
 *   <sc-if value="{{condicion}}">     → mostrar si se cumple
 *   onClick="{{funcion}}"             → acciones (abrir fechas, flyer, etc.)
 *   <script type="text/x-dc" data-props='{...}'> class Component extends DCLogic
 *
 * Usa Preact (runtime/preact.min.js) solo para actualizar el DOM sin
 * reiniciar animaciones cuando el contador cambia cada segundo.
 */
(function () {
  'use strict';

  var P = window.preact;
  if (!P) { console.error('[Black Days] Falta runtime/preact.min.js'); return; }
  var h = P.h, Fragment = P.Fragment;

  // ---------- Base de la lógica del lienzo ----------
  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState(patch) {
      var prev = this.state || {};
      var next = typeof patch === 'function' ? patch(prev, this.props) : patch;
      this.state = Object.assign({}, prev, next || {});
      schedule();
    }
    forceUpdate() { schedule(); }
  }
  window.DCLogic = DCLogic;

  // ---------- Expresiones {{ }} ----------
  var TOKEN = /\{\{([^}]*)\}\}/g;
  var EXACT = /^\s*\{\{([^}]*)\}\}\s*$/;

  function lookup(expr, scopes) {
    expr = expr.trim();
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (expr === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);
    if (/^(['"]).*\1$/.test(expr)) return expr.slice(1, -1);
    var parts = expr.split('.');
    var v, found = false;
    for (var i = scopes.length - 1; i >= 0; i--) {
      var s = scopes[i];
      if (s != null && parts[0] in Object(s)) { v = s[parts[0]]; found = true; break; }
    }
    if (!found) return undefined;
    for (var j = 1; j < parts.length; j++) { if (v == null) return undefined; v = v[parts[j]]; }
    return v;
  }

  function interpolate(str, scopes) {
    var m = str.match(EXACT);
    if (m) return lookup(m[1], scopes);
    return str.replace(TOKEN, function (_, e) { var v = lookup(e, scopes); return v == null ? '' : String(v); });
  }

  var BOOLEAN_ATTRS = { hidden: 1, disabled: 1, open: 1, checked: 1, required: 1, selected: 1, muted: 1, autoplay: 1, loop: 1, controls: 1, playsinline: 1, readonly: 1, multiple: 1, novalidate: 1 };

  // ---------- Plantilla → nodos virtuales ----------
  function renderNodes(nodes, scopes, out) {
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.nodeType === 3) {
        var text = node.nodeValue;
        if (text.indexOf('{{') === -1) { out.push(text); continue; }
        var v = interpolate(text, scopes);
        out.push(v == null ? '' : String(v));
        continue;
      }
      if (node.nodeType !== 1) continue;
      var tag = node.localName;

      if (tag === 'helmet') continue;
      if (tag === 'sc-for') {
        var list = lookup((node.getAttribute('list') || '').replace(/^\s*\{\{|\}\}\s*$/g, ''), scopes);
        var as = node.getAttribute('as') || 'item';
        (Array.isArray(list) ? list : []).forEach(function (item, idx) {
          var sc = {}; sc[as] = item; sc[as + 'Index'] = idx;
          renderNodes(node.childNodes, scopes.concat([sc]), out);
        });
        continue;
      }
      if (tag === 'sc-if') {
        var cond = lookup((node.getAttribute('value') || '').replace(/^\s*\{\{|\}\}\s*$/g, ''), scopes);
        if (cond) renderNodes(node.childNodes, scopes, out);
        continue;
      }

      var props = {};
      for (var a = 0; a < node.attributes.length; a++) {
        var at = node.attributes[a];
        var name = at.name;
        if (name.indexOf('hint-') === 0) continue;
        var val = at.value.indexOf('{{') === -1 ? at.value : interpolate(at.value, scopes);
        if (name.slice(0, 2) === 'on') {
          if (typeof val === 'function') props['on' + name.charAt(2).toUpperCase() + name.slice(3)] = val;
          continue;
        }
        if (val === '' && BOOLEAN_ATTRS[name]) val = true;
        if (val === false || val == null) {
          if (name.indexOf('aria-') === 0 || name.indexOf('data-') === 0) props[name] = String(val);
          continue;
        }
        props[name] = val;
      }
      var children = [];
      renderNodes(node.childNodes, scopes, children);
      out.push(h.apply(null, [tag, props].concat(children)));
    }
  }

  // ---------- Arranque ----------
  var inst, nodes, root, pending = false;

  function draw() {
    pending = false;
    var vals = {};
    try { vals = inst.renderVals ? inst.renderVals() : {}; }
    catch (e) { console.error('[Black Days] Error en renderVals()', e); }
    var out = [];
    renderNodes(nodes, [vals], out);
    P.render(h.apply(null, [Fragment, null].concat(out)), root);
  }

  function schedule() {
    if (pending || !root) return;
    pending = true;
    Promise.resolve().then(draw);
  }

  function boot() {
    var tpl = document.getElementById('dc-source');
    var source = tpl ? tpl.content : document;
    var xdc = source.querySelector('x-dc');
    if (!xdc) { console.error('[Black Days] No se encontró <x-dc>'); return; }

    var helmet = xdc.querySelector('helmet');
    if (helmet) {
      Array.prototype.forEach.call(helmet.childNodes, function (n) {
        if (n.nodeType === 1) document.head.appendChild(document.importNode(n, true));
      });
    }

    var script = document.querySelector('script[type="text/x-dc"]');
    var defs = {};
    try { defs = JSON.parse(script.getAttribute('data-props') || '{}'); } catch (e) {}
    var props = {};
    Object.keys(defs).forEach(function (k) {
      if (k.charAt(0) !== '$' && defs[k] && 'default' in defs[k]) props[k] = defs[k]['default'];
    });

    var Component = new Function('DCLogic', script.textContent + '\n;return Component;')(DCLogic);
    inst = new Component(props);
    inst.props = props;
    if (!inst.state) inst.state = {};

    nodes = Array.prototype.filter.call(xdc.childNodes, function (n) {
      return !(n.nodeType === 1 && n.localName === 'helmet');
    });

    root = document.createElement('div');
    root.id = 'bd-root';
    var anchor = tpl || xdc;
    anchor.parentNode.insertBefore(root, anchor);
    if (!tpl) xdc.style.display = 'none';

    draw();
    if (typeof inst.componentDidMount === 'function') inst.componentDidMount();
    document.documentElement.setAttribute('data-bd-ready', '');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
