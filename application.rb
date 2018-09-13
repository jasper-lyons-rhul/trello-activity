require 'viewer'
require './lib/trello.rb'

class Application < Viewer::View
  configure do |config|
    config.layout = 'application'
    config.css.add('assets/app.css')
  end
end
