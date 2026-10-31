package br.com.academiacfop.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;
import android.view.View;
import android.view.ViewGroup;

import org.json.JSONObject;

import java.io.OutputStream;
import java.util.Base64;

/**
 * Academia CFOP para Android.
 *
 * Abre o site oficial em uma experiência de aplicativo, sem barra de URL.
 * Os dados locais do WebView são distintos dos dados do Chrome e podem ser
 * exportados/importados pela área Histórico da Academia CFOP.
 *
 * Este app NÃO hospeda código de fontes desconhecidas; links externos
 * abrem no navegador do Android. As chamadas REST do Supabase realizadas
 * pelo JavaScript do site continuam funcionando por HTTPS.
 */
public final class MainActivity extends Activity {
    private static final String HOME = "https://allanghabriell.github.io/metodocpof/";
    private static final String ALLOWED_HOST = "allanghabriell.github.io";
    private static final String APP_PATH = "/metodocpof/";
    private static final int UPLOAD_REQUEST = 1241;
    private static final int MAX_BASE64_LENGTH = 18_000_000;

    private WebView browser;
    private ProgressBar loading;
    private ValueCallback<Uri[]> fileCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(11, 26, 53));
        getWindow().setNavigationBarColor(Color.rgb(10, 17, 35));

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(8, 22, 41));

        browser = new WebView(this);
        browser.setBackgroundColor(Color.rgb(8, 22, 41));
        browser.setOverScrollMode(View.OVER_SCROLL_NEVER);
        browser.setVerticalScrollBarEnabled(false);
        browser.setHorizontalScrollBarEnabled(false);
        root.addView(browser, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        loading = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        loading.setIndeterminate(false);
        loading.setMax(100);
        FrameLayout.LayoutParams loadingParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 5);
        root.addView(loading, loadingParams);
        loading.setVisibility(View.GONE);
        setContentView(root);

        WebSettings webSettings = browser.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        webSettings.setSupportZoom(false);
        webSettings.setBuiltInZoomControls(false);
        webSettings.setDisplayZoomControls(false);
        webSettings.setTextZoom(100);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setUseWideViewPort(true);
        webSettings.setJavaScriptCanOpenWindowsAutomatically(false);
        webSettings.setSupportMultipleWindows(false);
        webSettings.setAllowFileAccess(false);
        webSettings.setAllowContentAccess(true);
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        webSettings.setMediaPlaybackRequiresUserGesture(true);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(browser, true);

        browser.addJavascriptInterface(new NativeBridge(), "CFOPAndroid");
        browser.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                Uri target = request.getUrl();
                if (isAppUrl(target)) return false;

                String host = target.getHost();
                if (host != null && host.equals("mygszfrgmrbnhbuhhzba.supabase.co")
                        && target.getPath() != null
                        && target.getPath().contains("/auth/v1/authorize")) {
                    new AlertDialog.Builder(MainActivity.this)
                            .setTitle("Entrar com Google")
                            .setMessage("Por segurança, o Google exige login no navegador. Esse login pode não ser transferido para o aplicativo. Para entrar diretamente no APK, prefira e-mail e senha.")
                            .setNegativeButton("Voltar", (d, w) -> {})
                            .setPositiveButton("Abrir no navegador", (d, w) -> openExternal(target))
                            .show();
                    return true;
                }
                openExternal(target);
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                loading.setVisibility(View.GONE);
                if (isAppUrl(Uri.parse(url))) installNativeShareBridge();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request,
                                        android.webkit.WebResourceError error) {
                if (request.isForMainFrame()) {
                    Toast.makeText(MainActivity.this,
                            "Sem conexão. Se já usou o site, tente novamente para carregar o cache.",
                            Toast.LENGTH_LONG).show();
                }
            }
        });
        browser.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int progress) {
                loading.setProgress(progress);
                loading.setVisibility(progress >= 100 ? View.GONE : View.VISIBLE);
            }

            @Override
            public boolean onShowFileChooser(WebView view,
                                             ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    Intent chooser = params.createIntent();
                    startActivityForResult(chooser, UPLOAD_REQUEST);
                    return true;
                } catch (Exception e) {
                    fileCallback.onReceiveValue(null);
                    fileCallback = null;
                    Toast.makeText(MainActivity.this, "Não foi possível escolher o arquivo.",
                            Toast.LENGTH_SHORT).show();
                    return false;
                }
            }
        });

        browser.setDownloadListener((url, userAgent, contentDisposition, mimeType, length) -> {
            if (url.startsWith("blob:")) {
                exportBlobFromSite(url, URLUtil.guessFileName(url, contentDisposition, mimeType));
            } else {
                downloadHttps(url, contentDisposition, mimeType, userAgent);
            }
        });

        if (savedInstanceState != null && browser.restoreState(savedInstanceState) != null) {
            return;
        }
        browser.loadUrl(HOME);
    }

    private boolean isAppUrl(Uri uri) {
        if (uri == null || !"https".equalsIgnoreCase(uri.getScheme())) return false;
        if (!ALLOWED_HOST.equalsIgnoreCase(uri.getHost())) return false;
        String path = uri.getPath();
        return path != null && (path.equals("/metodocpof") || path.startsWith(APP_PATH));
    }

    private void openExternal(Uri target) {
        String scheme = target.getScheme();
        if (!"https".equalsIgnoreCase(scheme)
                && !"http".equalsIgnoreCase(scheme)
                && !"mailto".equalsIgnoreCase(scheme)
                && !"tel".equalsIgnoreCase(scheme)) return;
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, target));
        } catch (Exception e) {
            Toast.makeText(this, "Nenhum aplicativo disponível para abrir o link.",
                    Toast.LENGTH_SHORT).show();
        }
    }

    private void downloadHttps(String url, String disposition, String mime, String agent) {
        try {
            Uri uri = Uri.parse(url);
            if (!"https".equalsIgnoreCase(uri.getScheme())) return;
            String name = cleanFileName(URLUtil.guessFileName(url, disposition, mime));
            DownloadManager.Request request = new DownloadManager.Request(uri)
                    .setTitle(name)
                    .setDescription("Academia CFOP")
                    .setMimeType(mime)
                    .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
            request.addRequestHeader("User-Agent", agent == null ? "" : agent);
            String cookie = CookieManager.getInstance().getCookie(url);
            if (cookie != null) request.addRequestHeader("Cookie", cookie);
            ((DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE)).enqueue(request);
            toast("Arquivo enviado para Downloads.");
        } catch (Exception e) {
            toast("Não foi possível baixar este arquivo.");
        }
    }

    private void exportBlobFromSite(String blobUrl, String name) {
        String js = "(async function(){try{"
                + "const r=await fetch(" + JSONObject.quote(blobUrl) + ");"
                + "const b=await r.blob();const fr=new FileReader();"
                + "fr.onload=()=>CFOPAndroid.saveBase64(fr.result,"
                + JSONObject.quote(cleanFileName(name)) + ",b.type||'application/octet-stream');"
                + "fr.readAsDataURL(b);"
                + "}catch(e){console.warn('Falha ao baixar arquivo:',e)}})();";
        browser.evaluateJavascript(js, null);
    }

    /**
     * Adapta o compartilhamento de cartão do site ao compartilhador nativo.
     * É executado somente nas páginas HTTPS permitidas.
     */
    private void installNativeShareBridge() {
        String script = "(function(){"
                + "if(window.__cfopAndroidShareReady)return;"
                + "window.__cfopAndroidShareReady=true;"
                + "if(typeof navigator.share==='function')return;"
                + "const share=async function(data){"
                + "if(data&&data.files&&data.files.length){"
                + "const file=data.files[0];await new Promise((resolve,reject)=>{"
                + "const reader=new FileReader();"
                + "reader.onload=()=>{CFOPAndroid.shareBase64(reader.result,file.name,file.type||'image/png');resolve()};"
                + "reader.onerror=reject;reader.readAsDataURL(file)});return}"
                + "CFOPAndroid.shareText([data?.title,data?.text,data?.url].filter(Boolean).join('\\n'))};"
                + "try{Object.defineProperty(navigator,'share',{value:share,configurable:true})}catch(e){}"
                + "try{Object.defineProperty(navigator,'canShare',{value:(d)=>!!d,configurable:true})}catch(e){}"
                + "})();";
        browser.evaluateJavascript(script, null);
    }

    private String cleanFileName(String raw) {
        String file = raw == null ? "academia-cfop.png" : raw;
        file = file.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (file.length() > 90) file = file.substring(file.length() - 90);
        if (file.isBlank() || file.equals(".") || file.equals("..")) file = "academia-cfop.png";
        return file;
    }

    private Uri storeData(String dataUri, String rawName, String rawMime) {
        if (dataUri == null || dataUri.length() > MAX_BASE64_LENGTH) return null;
        String mime = rawMime == null ? "" : rawMime;
        if (!mime.equals("image/png") && !mime.equals("image/jpeg")
                && !mime.equals("text/csv") && !mime.equals("application/json")
                && !mime.equals("application/octet-stream")) return null;
        int index = dataUri.indexOf(',');
        if (!dataUri.startsWith("data:") || index < 0) return null;
        try {
            byte[] bytes = android.util.Base64.decode(
                    dataUri.substring(index + 1), android.util.Base64.DEFAULT);
            if (bytes.length > 12_000_000) return null;

            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, cleanFileName(rawName));
            values.put(MediaStore.Downloads.MIME_TYPE, mime);
            values.put(MediaStore.Downloads.RELATIVE_PATH,
                    Environment.DIRECTORY_DOWNLOADS + "/Academia CFOP");
            values.put(MediaStore.Downloads.IS_PENDING, 1);
            Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) return null;
            try (OutputStream stream = getContentResolver().openOutputStream(uri)) {
                if (stream == null) throw new IllegalStateException("Não foi possível abrir arquivo");
                stream.write(bytes);
            } catch (Exception e) {
                getContentResolver().delete(uri, null, null);
                return null;
            }
            values.clear();
            values.put(MediaStore.Downloads.IS_PENDING, 0);
            getContentResolver().update(uri, values, null, null);
            return uri;
        } catch (Exception e) {
            return null;
        }
    }

    private void toast(String message) {
        runOnUiThread(() -> Toast.makeText(this, message, Toast.LENGTH_SHORT).show());
    }

    private final class NativeBridge {
        @JavascriptInterface
        public void saveBase64(String dataUri, String name, String mime) {
            Uri uri = storeData(dataUri, name, mime);
            toast(uri == null ? "Não foi possível salvar o arquivo."
                              : "Arquivo salvo em Downloads/Academia CFOP.");
        }

        @JavascriptInterface
        public void shareBase64(String dataUri, String name, String mime) {
            Uri uri = storeData(dataUri, name, mime);
            if (uri == null) {
                toast("Não foi possível preparar o compartilhamento.");
                return;
            }
            runOnUiThread(() -> {
                Intent send = new Intent(Intent.ACTION_SEND);
                send.setType(mime);
                send.putExtra(Intent.EXTRA_STREAM, uri);
                send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                startActivity(Intent.createChooser(send, "Compartilhar pela Academia CFOP"));
            });
        }

        @JavascriptInterface
        public void shareText(String data) {
            if (data == null || data.length() > 3000) return;
            runOnUiThread(() -> {
                Intent send = new Intent(Intent.ACTION_SEND);
                send.setType("text/plain");
                send.putExtra(Intent.EXTRA_TEXT, data);
                startActivity(Intent.createChooser(send, "Compartilhar pela Academia CFOP"));
            });
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != UPLOAD_REQUEST || fileCallback == null) return;
        Uri[] chosen = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
        fileCallback.onReceiveValue(chosen);
        fileCallback = null;
    }

    @Override
    public void onBackPressed() {
        if (browser != null && browser.canGoBack()) browser.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle state) {
        if (browser != null) browser.saveState(state);
        super.onSaveInstanceState(state);
    }

    @Override
    protected void onDestroy() {
        if (fileCallback != null) {
            fileCallback.onReceiveValue(null);
            fileCallback = null;
        }
        if (browser != null) {
            browser.stopLoading();
            browser.removeJavascriptInterface("CFOPAndroid");
            browser.destroy();
            browser = null;
        }
        super.onDestroy();
    }
}
