(function(){let e=`https://cdn.jsdelivr.net/pyodide/v314.0.6/full/`,t=null,n=String.raw`
import ast
import base64
import contextlib
import io
import json
import os
import sys
import traceback

os.environ["MPLBACKEND"] = "Agg"
__course_sessions = {}

def __course_repr(value):
    if value is None:
        return None, None
    html = None
    try:
        renderer = getattr(value, "_repr_html_", None)
        if renderer:
            html = renderer()
    except Exception:
        html = None
    try:
        text = repr(value)
    except Exception:
        text = f"<{type(value).__name__}>"
    return text, html

def __course_run(source, session_id):
    namespace = __course_sessions.setdefault(session_id, {"__name__": "__main__"})
    displayed = []

    def display(*values):
        for value in values:
            text, html = __course_repr(value)
            displayed.append({"type": "html", "html": html} if html else {"type": "result", "text": text})

    namespace.setdefault("display", display)
    stdout = io.StringIO()
    stderr = io.StringIO()
    result = None
    failure = None
    try:
        tree = ast.parse(source, mode="exec")
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            if tree.body and isinstance(tree.body[-1], ast.Expr):
                prefix = ast.Module(body=tree.body[:-1], type_ignores=[])
                if prefix.body:
                    exec(compile(prefix, "<lesson>", "exec"), namespace, namespace)
                expression = ast.Expression(tree.body[-1].value)
                result = eval(compile(expression, "<lesson>", "eval"), namespace, namespace)
            else:
                exec(compile(tree, "<lesson>", "exec"), namespace, namespace)
    except BaseException:
        failure = traceback.format_exc()

    outputs = []
    if stdout.getvalue():
        outputs.append({"type": "stdout", "text": stdout.getvalue()})
    if stderr.getvalue():
        outputs.append({"type": "stderr", "text": stderr.getvalue()})
    outputs.extend(displayed)
    if result is not None:
        text, html = __course_repr(result)
        outputs.append({"type": "html", "html": html} if html else {"type": "result", "text": text})

    try:
        if "matplotlib.pyplot" in sys.modules:
            import matplotlib.pyplot as plt
            for figure_number in plt.get_fignums():
                buffer = io.BytesIO()
                plt.figure(figure_number).savefig(buffer, format="png", dpi=144, bbox_inches="tight", facecolor="white")
                outputs.append({"type": "image", "mime": "image/png", "data": base64.b64encode(buffer.getvalue()).decode("ascii")})
            plt.close("all")
    except BaseException:
        if failure is None:
            failure = traceback.format_exc()

    if failure:
        outputs.append({"type": "error", "text": failure})
    return json.dumps(outputs, ensure_ascii=False)

def __course_reset(session_id):
    __course_sessions.pop(session_id, None)
`;async function r(){return t||=(async()=>{let t=await(await import(`${e}pyodide.mjs`)).loadPyodide({indexURL:e});return t.runPython(n),t})(),t}self.addEventListener(`message`,async e=>{let{id:t,type:n,sessionId:i}=e.data;try{let a=await r();if(n===`reset`){a.globals.set(`__course_session_id`,i),await a.runPythonAsync(`__course_reset(__course_session_id)`);return}let o=e.data.code??``;self.postMessage({id:t,type:`status`,message:`טוען את סביבת Python…`}),e.data.preloadPackages?.length&&await a.loadPackage(e.data.preloadPackages);try{await a.loadPackagesFromImports(o)}catch{}self.postMessage({id:t,type:`status`,message:`מריץ את הקוד…`}),a.globals.set(`__course_source`,o),a.globals.set(`__course_session_id`,i);let s=await a.runPythonAsync(`__course_run(__course_source, __course_session_id)`),c=JSON.parse(String(s));s?.destroy?.(),self.postMessage({id:t,type:`result`,outputs:c})}catch(e){self.postMessage({id:t,type:`error`,message:e instanceof Error?e.message:String(e)})}})})();