class TabTable
  def initialize(data)
    @data = data
  end

  def to_s
    offsets = @data.transpose.map do |column|
      (column.map { |value| value.to_s.length }.max / 8) + 1
    end

    @data.map do |row|
      row.zip(offsets).map do |value, offset|
        "#{value}#{ "\t" * (offset - (value.to_s.length / 8)) }"
      end.join
    end.join("\n")
  end
end
