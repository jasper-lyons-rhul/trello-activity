require './application.rb'

class Index < Application
  configure do |config|
    config.template = 'index'
  end

  def initialize(key)
    super()
    @key = key
  end

  expose :key do
    @key
  end
end
