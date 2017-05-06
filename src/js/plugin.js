var type = (document.contentType || 'unknown').toLowerCase()

if ((type === 'text/plain') || (type === 'text/markdown')) {
  chrome.storage.local.get({ enabled: true }, function (config) {
    // Local variables
    var enabled = config.enabled
    var console = window.console
    var marked = window.marked
    var hljs = window.hljs
    var md = null

    // Setup base body class
    document.body.setAttribute('class', enabled ? 'enabled' : 'disabled')

    // Add a listener waiting for enabled/disabled events
    chrome.storage.onChanged.addListener(function (changes, area) {
      enabled = changes.enabled.newValue
      document.body.setAttribute('class', enabled ? 'enabled' : 'disabled')
    })

    // Add our stylesheets
    ;(function css () {
      for (var i = 0; i < arguments.length; i++) {
        var href = chrome.extension.getURL('css/' + arguments[i] + '.css')
        if (href) {
          var link = document.createElement('link')
          link.setAttribute('rel', 'stylesheet')
          link.setAttribute('href', href)
          document.head.appendChild(link)
        }
      }
    })('markdown', 'default', 'github', 'page')

    // Get a list of valid languages
    var languages = {}
    hljs.listLanguages().forEach(function (lang) {
      languages[lang.toLowerCase()] = lang
    })

    // var toc = []
    // var renderer = new marked.Renderer()

    // renderer.heading = function(text, level, raw) {
    //   var anchor = this.options.headerPrefix + raw.toLowerCase().replace(/[^\w]+/g, '-')
    //   toc.push({ anchor: anchor, level: level, text: text })
    //   return '<h'+ level+ ' id="'+ anchor+ '">'+ text+ '</h'+ level+ '>\n'
    // }

    // Set up marked with our highlight parser
    marked.setOptions({
      // renderer: renderer,
      highlight: function (data, lang) {
        // Language case normalization
        lang = lang && lang.toLowerCase()

        // Is this a known language or autodetect?
        if (lang && languages[lang]) {
          data = hljs.highlight(languages[lang], data, true)
        } else {
          data = hljs.highlightAuto(data)
        }

        // Wrap in a class with whatever language we found
        // return '<code class="hljs ' + data.language + '">' + data.value + '</code>'
        return data.value
      }
    })

    // Recreate the body given some markdown text
    function render (markdown) {
      // Highlight as markdown, and render markdown
      var highlighted = hljs.highlight('markdown', markdown, true).value
      var rendered = marked.parse(markdown)

      // var tocHTML = '<ul>\n'
      // toc.forEach(function (entry) {
      //   tocHTML += '<li><a href="#' + entry.anchor + '">' + entry.text + '</a></li>\n'
      // })
      // tocHTML += '</ul>\n'

      // rendered = rendered.replace(/\[TOC\]/g, tocHTML)

      // Setup the document's body
      document.body.innerHTML = '<pre class="hljs markdown markdown-source">' + highlighted + '</pre><article class="markdown-body">' + rendered + '</article>'

      // Return the original markdown
      return markdown
    }

    // Evaluate our root <pre>, containing the text
    var pre = document.body.getElementsByTagName('pre')[0]
    if (pre && pre.firstChild) {
      // Remember the original text we loaded
      md = render(pre.firstChild.nodeValue)

      // Set a timer checking for file (only) changes
      if (window.location.href.startsWith('file://')) {
        console.log('Checking for changes on ' + window.location.href + ' every 3 seconds')

        // Set running on interval...
        window.setInterval(function () {
          // Use an XMLHttpRequest
          var request = new XMLHttpRequest()
          request.open('GET', window.location.href)
          request.send()

          // Get notification when the state changes
          request.onreadystatechange = function () {
            if (request.readyState !== 4) return

            // Check if the text was changed
            var text = request.responseText
            if (text === md) return

            // Some changes here... Re-render and save the content
            console.log('Changes detected on ' + window.location.href)
            md = render(text)
          }
        }, 3000)
      } else {
        console.log('Not checking for changes on ' + window.location.href + ', reload manually')
      }
    }
  })
} else {
  console.log('Not rendering markdown for content type: ' + type)
}
