require 'viewer'

class Index < Viewer::View
  configure do |config|
    config.template = 'index'
    config.css.add('assets/app.css')
  end

  def initialize(key)
    super()
    @key = key
  end

  expose :key do
    @key
  end
end
