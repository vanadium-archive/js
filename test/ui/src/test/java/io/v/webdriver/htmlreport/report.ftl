<!DOCTYPE html>
<html>
  <head>
    <title>${data.testName}</title>
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"></script>
    <link  href="https://cdnjs.cloudflare.com/ajax/libs/fotorama/4.6.3/fotorama.css" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/fotorama/4.6.3/fotorama.js"></script>
    <script>
     // Set "Test Failed" caption to red background.
     $(function() {
        $('.fotorama').on('fotorama:show', function(e, fotorama, extra) {
          $(".fotorama__caption__wrap").each(function(index) {
            if ($(this).text() == "Test Failed") {
              $(this).addClass('failed-test');
            }
          });
        });
      });
    </script>
    <style>
      body {
        font-family: Helvetica, Arial, sans-serif;
      }

      h1 {
        font-size: 20px;
        color: #0097A7;
      }

      .failed-test {
        background-color: rgba(200, 0, 0, 0.9) !important;
        color: white !important;
      }

      .fotorama__caption {
        left: auto !important;
        right: 0px;
        top: 0px;
      }

      .fotorama__caption__wrap {
        border: solid 1px #AAA;
        font-weight: bold;
      }

      .fotorama__thumb-border {
        border-color: #0097A7 !important;
      }

      .fotorama__wrap {
        margin: 0 auto;
      }
    </style>
  </head>
  <body>
    <h1>${data.testName}</h1>
    <div class="fotorama"
        data-width="800px"
        data-ratio="800/600"
        data-nav="thumbs"
        data-keyboard="true"
        data-thumbwidth=60
        data-thumbheight=45>
      <#list data.screenshots as screenshot>
        <img class="failed-test" src="${screenshot.fileName}" data-caption="${screenshot.caption}"/>
      </#list>
    </div>
  </body>
</html>