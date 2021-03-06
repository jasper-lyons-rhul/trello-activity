require 'net/http'
require 'uri'
require 'openssl'
require 'json'
require 'time'

class Http
  def initialize(headers = {}, params = {})
    @headers = headers
    @params = params
  end

  def with_params(url, params)
    new_params = @params.
      merge(params || {}).
      map do |key, value|
      case value
      when Array
        # trello way of doing params
        "#{key}=#{value.join(',')}"
      else
        "#{key}=#{value}"
      end
    end

    "#{url}?#{new_params.join('&')}"
  end

  def request(method, url, params = nil, body = {}, retry_time = 2)
    uri = URI(with_params(url, params))
    http = Net::HTTP.new(uri.host, uri.port)

    if uri.scheme == 'https'
      http.use_ssl = true
      http.verify_mode = OpenSSL::SSL::VERIFY_NONE
    end

    req = case method
          when 'get', 'GET', :get
            Net::HTTP::Get.new(uri)
          else
            raise "HTTP Method #{method} not implemented"
          end

    @headers.each do |key, value|
      # allow headers to be lazily evaluated
      req[key.to_s] = value.respond_to?(:call) && value.call(req) || value
    end

    http.request(req).tap do |res|
      case res
      when Net::HTTPSuccess
        res
      when Net::HTTPError
        puts "#{uri} - #{res.code} - #{res.body}"

        case res.code
        when 429
          sleep retry_time
          request(method, url, params, body, retry_time * retry_time)
        end
      end
    end
  end

  def get(url, params = nil)
    request(:get, url, params)
  end
end


module Trello 
  class Base
    def initialize(http, data, path)
      @http = http
      @data = data
      @path = path
      @cache = {}
    end

    attr_accessor :data

    def id
      @data['id']
    end

    def from_api(path)
      "https://api.trello.com/1/#{path}" 
    end

    def path(entity)
      "#{@path}/#{id}/#{entity}"
    end

    def nested(entity, params = nil)
      @cache.fetch(entity) do
        path = from_api(path(entity))
        res = @http.get(path, params)
        @cache[entity] = JSON.parse(res.body)
      end
    end

    def ==(other)
      self.id == other.id
    end
  end

  class Member < Base
    def initialize(http, data)
      super(http, data, 'members')
    end

    def organizations
      nested('organizations').map { |o| Organization.new(@http, o) }
    end

    def actions(params = nil)
      nested("actions", params).map { |a| Action.new(@http, a) }
    end

    def full_name
      @data['fullName']
    end
  end

  class Organization < Base
    def initialize(http, data)
      super(http, data, 'organizations')
    end

    def members(params = nil)
      nested('members', params).map { |m| Member.new(@http, m) }
    end

    def boards
      nested('boards').map { |m| Board.new(@http, m) }
    end

    def actions
      nested("actions").map { |a| Action.new(@http, a) }
    end

    def display_name
      @data['displayName']
    end
  end

  class Board < Base
    def initialize(http, data)
      super(http, data, 'board')
    end

    def actions(params = nil)
      nested("actions", params).map { |a| Action.new(@http, a) }
    end

    def name
      @data['name']
    end
  end

  class Action < Base
    def initialize(http, data)
      super(http, data, 'actions')
    end

    def type
      @data['type']
    end

    def date
      Time.parse(@data['date'])
    end

    def creator
      Member.new(@http, @data['memberCreator'])
    end
  end
end
