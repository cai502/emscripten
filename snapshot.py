#!/usr/bin/env python

# Prerequisites:
#  - geckodriver https://github.com/mozilla/geckodriver/releases
#  - chromedriver https://sites.google.com/a/chromium.org/chromedriver/getting-started

import sys, os, time, subprocess, signal, base64
from selenium import webdriver
from selenium.webdriver.support.ui import Select
from argparse import ArgumentParser
from PIL import Image, ImageChops

def get_driver(browser):
  driver = None
  if browser == 'chrome':
    driver = webdriver.Chrome()
  elif browser == 'chrome_canary':
    chrome_options = webdriver.chrome.options.Options()
    chrome_options.binary_location = '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'
    driver = webdriver.Chrome(chrome_options=chrome_options)
  elif browser == 'firefox':
    driver = webdriver.Firefox()
  elif browser == 'firefox_nightly':
    driver = webdriver.Firefox(firefox_binary='/Applications/FirefoxNightly.app/Contents/MacOS/firefox')
  elif browser == 'safari':
    driver = webdriver.Safari()
  elif browser == 'safari_preview':
    caps = webdriver.common.desired_capabilities.DesiredCapabilities.SAFARI.copy()
    caps['useTechnologyPreview'] = True
    driver = webdriver.Safari(desired_capabilities=caps, executable_path='/Applications/Safari Technology Preview.app/Contents/MacOS/safaridriver')
  return driver

def take_snapshot(browser, html_file, timeout, model): 
  driver = None
  try:
    driver = get_driver(browser)
    driver.implicitly_wait(30)
    driver.get("http://localhost:6931/"+os.path.basename(html_file))
    driver.execute_script("if(typeof Module === 'undefined') Module = {}; Module['shouldPreserveDrawingBuffer'] = 1;")
    playground_select = Select(driver.find_element_by_id('playground-select'))
    playground_select.select_by_value(model)
    button_launch = driver.find_element_by_id('button-launch')
    button_launch.click()
    time.sleep(timeout)
    canvas = driver.find_element_by_id('app-canvas')
    canvas_base64 = driver.execute_script("return arguments[0].toDataURL('image/png').substring(21);", canvas)
    return base64.b64decode(canvas_base64)
  except:
    return None
  finally: 
    if driver:
      try:
        driver.close()
      except:
        pass

def compare_image(file1, file2):
  image1 = Image.open(file1, 'r')
  image2 = Image.open(file2, 'r')
  diff_image = ImageChops.difference(image1, image2)
  
  diff = 0.0
  width, height = diff_image.size
  for j in range(height):
    for i in range(width):
      r, g, b, a = diff_image.getpixel((i,j))
      diff += r*r + g*g + b*b + a*a
  return diff / 255 / 255 / 4 / width / height

def main():
  argparser = ArgumentParser(description='Compare result image')
  argparser.add_argument('html_file', type=str, help='html file name to execute')
  argparser.add_argument('--browser', type=str, help='chrome,chrome_canary,firefox,firefox_nightly,safari,safari_preview,all', default='chrome')
  argparser.add_argument('--model', type=str, help='wasm or asmjs', default='wasm')
  argparser.add_argument('--timeout', type=int, help='timeout after clicking launch button', default=60)
  argparser.add_argument('--expected-image', type=str, help='expected image', default=None)
  argparser.add_argument('--threshold', type=float, help='maximum difference treated as success', default=0.0)

  args = argparser.parse_args()

  proc = None
  success = True
  try:
    proc = subprocess.Popen(['emrun', '--no_browser', '--no_emrun_detect', args.html_file])
    time.sleep(1)

    if args.browser == 'all':
      browsers = ['chrome','chrome_canary','firefox','firefox_nightly','safari','safari_preview']
    else:
      browsers = [args.browser]

    if args.model == 'all':
      models = ['wasm', 'asmjs']
    else:
      models = [args.model]

    for model in models:
      for browser in browsers:
        canvas_png = take_snapshot(browser, args.html_file, args.timeout, model)
        if canvas_png:
          filename = 'result_' + browser + '_' + model + '.png'
          with open(filename, 'wb') as f:
            f.write(canvas_png)
          if args.expected_image:
            diff = compare_image(filename, args.expected_image)
            result = diff <= args.threshold
            success = success and result
            print "browser=%s\tmodel=%s\tdiff=%f\tresult=%s" % (browser, model, diff, 'OK' if result else 'NG')
        else:
          success = False
          if args.expected_image:
            print "browser=%s\tmodel=%s\tdiff=%f\tresult=%s" % (browser, model, 1.0, 'FAIL')
  except:
    success = False
  finally:
    if proc:
      os.kill(proc.pid, signal.SIGINT)

  sys.exit(0 if success else 1)

main()
